/** 侧边导航菜单项定位 */
export const navItem = (title: string) => `nav >> text="${title}"`;

/** MUI 表格行：按内容定位 */
export const tableRow = (text: string) => `tr:has-text("${text}")`;

/** Stock 搜索输入框 */
export const stockSearchInput = 'input[placeholder*="搜索"]';

/** 等待页面骨架屏/Loading 消失 */
export const loadingIndicator = '[role="progressbar"]';
