import { CONFIG } from 'src/config-global';
import { HasPermission } from 'src/permission/has-permission';

import { ModelProvidersView } from 'src/sections/model-providers/view';

export default function ModelProvidersPage() {
  return (
    <>
      <title>{`模型供应商 - ${CONFIG.appName}`}</title>
      <HasPermission
        roles={['SUPER_ADMIN']}
        fallback={<ModelProvidersView unauthorized />}
      >
        <ModelProvidersView />
      </HasPermission>
    </>
  );
}

