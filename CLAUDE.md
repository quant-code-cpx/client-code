@./AGENTS.md

# Claude 入口

根 `AGENTS.md` 是统一规则源。Claude 未自动发现 `.agents/skills/` 时，按 `AGENTS.md` 的 Skill 路由表
完整读取对应 `SKILL.md`；`.claude/skills/` 中的历史副本不再作为规范来源。
