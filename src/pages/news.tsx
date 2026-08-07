import { CONFIG } from 'src/config-global';

import { NewsFeedView } from 'src/sections/news/view';

export default function Page() {
  return (
    <>
      <title>{`新闻时事 - ${CONFIG.appName}`}</title>
      <NewsFeedView />
    </>
  );
}
