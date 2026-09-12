import type { Theme, CSSObject } from '@mui/material/styles';

import { varAlpha } from 'minimal-shared/utils';
import { useRouteError, isRouteErrorResponse } from 'react-router';

import GlobalStyles from '@mui/material/GlobalStyles';

// ----------------------------------------------------------------------

type ErrorBoundaryProps = {
  /** 仅用于本地排障；生产环境默认不输出异常细节。 */
  showDetails?: boolean;
};

export function ErrorBoundary({ showDetails = import.meta.env.DEV }: ErrorBoundaryProps) {
  const error = useRouteError();

  return (
    <>
      {inputGlobalStyles()}

      <div className={errorBoundaryClasses.root}>
        <div className={errorBoundaryClasses.container}>
          {renderErrorMessage(error, showDetails)}
        </div>
      </div>
    </>
  );
}

// ----------------------------------------------------------------------

function parseStackTrace(stack?: string) {
  if (!stack) return { filePath: null, functionName: null };

  const filePathMatch = stack.match(/\/src\/[^?]+/);
  const functionNameMatch = stack.match(/at (\S+)/);

  return {
    filePath: filePathMatch ? filePathMatch[0] : null,
    functionName: functionNameMatch ? functionNameMatch[1] : null,
  };
}

function renderErrorMessage(error: unknown, showDetails: boolean) {
  if (isRouteErrorResponse(error)) {
    if (!showDetails) {
      return (
        <>
          <h1 className={errorBoundaryClasses.title}>页面暂时无法打开</h1>
          <p className={errorBoundaryClasses.message}>请稍后重试。</p>
        </>
      );
    }

    return (
      <>
        <h1 className={errorBoundaryClasses.title}>
          {error.status}: {error.statusText}
        </h1>
        <p className={errorBoundaryClasses.message}>{error.data}</p>
      </>
    );
  }

  if (error instanceof Error) {
    if (!showDetails) {
      return (
        <>
          <h1 className={errorBoundaryClasses.title}>页面暂时无法打开</h1>
          <p className={errorBoundaryClasses.message}>请稍后重试。</p>
        </>
      );
    }

    const { filePath, functionName } = parseStackTrace(error.stack);

    return (
      <>
        <h1 className={errorBoundaryClasses.title}>Unexpected Application Error!</h1>
        <p className={errorBoundaryClasses.message}>
          {error.name}: {error.message}
        </p>
        <pre className={errorBoundaryClasses.details}>{error.stack}</pre>
        {(filePath || functionName) && (
          <p className={errorBoundaryClasses.filePath}>
            {filePath} ({functionName})
          </p>
        )}
      </>
    );
  }

  return (
    <h1 className={errorBoundaryClasses.title}>
      {showDetails ? 'Unknown Error' : '页面暂时无法打开'}
    </h1>
  );
}

// ----------------------------------------------------------------------

const errorBoundaryClasses = {
  root: 'error-boundary-root',
  container: 'error-boundary-container',
  title: 'error-boundary-title',
  details: 'error-boundary-details',
  message: 'error-boundary-message',
  filePath: 'error-boundary-file-path',
};

const rootStyles = (theme: Theme): CSSObject => ({
  display: 'flex',
  flex: '1 1 auto',
  alignItems: 'center',
  padding: '10vh 15px 0',
  flexDirection: 'column',
  fontFamily: theme.typography.fontFamily,
});

const contentStyles = (theme: Theme): CSSObject => ({
  gap: 24,
  padding: 20,
  width: '100%',
  maxWidth: 960,
  display: 'flex',
  borderRadius: 8,
  flexDirection: 'column',
  backgroundColor: theme.vars.palette.background.paper,
});

const titleStyles = (theme: Theme): CSSObject => ({
  margin: 0,
  lineHeight: 1.2,
  fontSize: theme.typography.pxToRem(20),
  fontWeight: theme.typography.fontWeightBold,
});

const messageStyles = (theme: Theme): CSSObject => ({
  margin: 0,
  lineHeight: 1.5,
  padding: '12px 16px',
  whiteSpace: 'pre-wrap',
  color: theme.vars.palette.error.dark,
  fontSize: theme.typography.pxToRem(14),
  fontFamily: theme.typography.fontFamily,
  backgroundColor: varAlpha(theme.vars.palette.error.mainChannel, 0.12),
  borderLeft: `2px solid ${theme.vars.palette.error.main}`,
  fontWeight: theme.typography.fontWeightBold,
  ...theme.applyStyles('dark', {
    color: theme.vars.palette.error.light,
    backgroundColor: varAlpha(theme.vars.palette.error.mainChannel, 0.16),
  }),
});

const detailsStyles = (theme: Theme): CSSObject => ({
  margin: 0,
  padding: 16,
  lineHeight: 1.5,
  overflow: 'auto',
  borderRadius: 'inherit',
  color: theme.vars.palette.warning.dark,
  fontFamily: theme.typography.fontFamily,
  backgroundColor: theme.vars.palette.background.neutral,
  ...theme.applyStyles('dark', {
    color: theme.vars.palette.warning.light,
  }),
});

const filePathStyles = (theme: Theme): CSSObject => ({
  marginTop: 0,
  color: theme.vars.palette.info.dark,
  fontFamily: theme.typography.fontFamily,
  ...theme.applyStyles('dark', {
    color: theme.vars.palette.info.light,
  }),
});

const inputGlobalStyles = () => (
  <GlobalStyles
    styles={(theme) => ({
      body: {
        margin: 0,
        color: theme.vars.palette.text.primary,
        backgroundColor: theme.vars.palette.background.default,
        [`& .${errorBoundaryClasses.root}`]: rootStyles(theme),
        [`& .${errorBoundaryClasses.container}`]: contentStyles(theme),
        [`& .${errorBoundaryClasses.title}`]: titleStyles(theme),
        [`& .${errorBoundaryClasses.message}`]: messageStyles(theme),
        [`& .${errorBoundaryClasses.filePath}`]: filePathStyles(theme),
        [`& .${errorBoundaryClasses.details}`]: detailsStyles(theme),
      },
    })}
  />
);
