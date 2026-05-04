import json, pathlib, random

path = pathlib.Path('src/mocks/data/factor.json')
data = json.loads(path.read_text())

categories = ['MOMENTUM','REVERSAL','VALUE','GROWTH','QUALITY','VOLATILITY',
              'LIQUIDITY','SIZE','DIVIDEND','ANALYST','TECHNICAL','MACRO']
source_types = ['FIELD_REF','DERIVED','CUSTOM_SQL']
statuses = ['UP_TO_DATE','STALE','FAILED','NEVER','RUNNING']

random.seed(42)

admin_items = []
for i in range(20):
    fn = f'factor_{i:03d}'
    cat = categories[i % len(categories)]
    src = source_types[i % len(source_types)]
    st = statuses[i % len(statuses)]
    stale = None if st in ('NEVER','RUNNING') else random.randint(0, 10)
    lcd = None if st == 'NEVER' else f"2025{random.randint(1,12):02d}{random.randint(1,28):02d}"
    cov = None if st in ('NEVER','FAILED') else round(random.uniform(0.4, 1.0), 3)
    row_count = random.randint(5000, 500000)
    admin_items.append({
        'factorName': fn,
        'factorLabel': f'测试因子{i:03d}',
        'status': st,
        'staleDays': stale,
        'lastComputeDate': lcd,
        'coverageRate': cov,
        'rowCount': row_count,
        'category': cat,
        'sourceType': src,
        'isEnabled': random.choice([True, True, True, False]),
        'firstComputeDate': None,
        'failureReason': '计算超时' if st == 'FAILED' else None,
    })

data['adminStatus'] = {'items': admin_items}

jobs = []
job_statuses = ['SUCCESS','RUNNING','PENDING','FAILED','PARTIAL','CANCELLED']
for j in range(8):
    jst = job_statuses[j % 6]
    done = random.randint(3, 20)
    total = done + (0 if jst == 'SUCCESS' else random.randint(0, 5))
    jobs.append({
        'jobId': f'job-mock-{j:04d}-abcd',
        'type': 'PRECOMPUTE' if j % 2 == 0 else 'BACKFILL',
        'tradeDate': f'20250{j+1:02d}15' if j % 2 == 0 else None,
        'startDate': None if j % 2 == 0 else '20240101',
        'endDate': None if j % 2 == 0 else '20240630',
        'factorCount': total,
        'progress': {'done': done, 'total': total},
        'status': jst,
        'durationMs': random.randint(1000, 120000) if jst not in ('PENDING','RUNNING') else None,
        'operator': 'admin' if j % 3 == 0 else 'scheduler',
        'createdAt': f'2025-0{(j%9)+1}-15T08:00:00Z',
        'completedAt': f'2025-0{(j%9)+1}-15T08:30:00Z' if jst not in ('PENDING','RUNNING') else None,
    })

data['adminJobs'] = {'items': jobs, 'total': len(jobs)}

data['adminJobDetail'] = {
    'jobId': 'job-mock-0000-abcd',
    'type': 'PRECOMPUTE',
    'tradeDate': '20250115',
    'startDate': None,
    'endDate': None,
    'factorCount': 5,
    'progress': {'done': 5, 'total': 5},
    'status': 'SUCCESS',
    'durationMs': 12500,
    'operator': 'admin',
    'createdAt': '2025-01-15T08:00:00Z',
    'completedAt': '2025-01-15T08:00:12Z',
    'subItems': [
        {'factorName': 'factor_000', 'status': 'SUCCESS', 'rowCount': 4800, 'errorMessage': None},
        {'factorName': 'factor_001', 'status': 'FAILED', 'rowCount': 0, 'errorMessage': 'TimeoutError: exceeded 30s limit'},
        {'factorName': 'factor_002', 'status': 'SUCCESS', 'rowCount': 5200, 'errorMessage': None},
    ],
    'logs': '2025-01-15 08:00:01 INFO Starting precompute\n2025-01-15 08:00:12 INFO Done.',
}

actions = ['PRECOMPUTE','BACKFILL','TOGGLE_ENABLE','TOGGLE_DISABLE','SCHEDULE_UPDATE','FACTOR_DELETE']
audit_items = []
for i in range(15):
    audit_items.append({
        'id': f'audit-{i:04d}',
        'createdAt': f'2025-01-{15-i:02d}T08:00:00Z',
        'operator': 'admin' if i % 3 != 0 else 'scheduler',
        'action': actions[i % len(actions)],
        'factorNames': [f'factor_{j:03d}' for j in range(i % 3 + 1)],
        'ip': f'192.168.1.{10 + i}',
        'success': i % 5 != 4,
    })

data['adminAudit'] = {'items': audit_items, 'total': len(audit_items)}

data['adminSchedule'] = {
    'cron': '0 19 * * 1-5',
    'enabled': True,
    'lastTriggeredAt': '2025-01-15T19:00:00Z',
    'nextTriggerAt': '2025-01-16T19:00:00Z',
    'timezone': 'Asia/Shanghai',
    'healthy': True,
    'lastError': None,
}

path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
print('Done. Keys:', list(data.keys()))
