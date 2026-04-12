import 'src/global.css';
import 'dayjs/locale/zh-cn';

import { useEffect } from 'react';

import { zhCN } from '@mui/x-date-pickers/locales';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { usePathname } from 'src/routes/hooks';

import { AuthProvider } from 'src/auth';
import { ThemeProvider } from 'src/theme/theme-provider';
import { SyncNotificationProvider } from 'src/contexts/sync-notification-context';

// ----------------------------------------------------------------------

type AppProps = {
  children: React.ReactNode;
};

export default function App({ children }: AppProps) {
  useScrollToTop();

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale="zh-cn"
      localeText={zhCN.components.MuiLocalizationProvider.defaultProps.localeText}
    >
      <ThemeProvider>
        <AuthProvider>
          <SyncNotificationProvider>{children}</SyncNotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </LocalizationProvider>
  );
}

// ----------------------------------------------------------------------

function useScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
