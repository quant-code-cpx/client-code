import type { ReactNode, ErrorInfo } from 'react';

import { Component } from 'react';

import Alert from '@mui/material/Alert';

type BlockErrorBoundaryProps = {
  blockId: string;
  children: ReactNode;
};

type BlockErrorBoundaryState = {
  failed: boolean;
};

export class BlockErrorBoundary extends Component<
  BlockErrorBoundaryProps,
  BlockErrorBoundaryState
> {
  state: BlockErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): BlockErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // 仅发送块标识，禁止记录模型正文、Tool payload 或持仓数据。
    window.dispatchEvent(
      new CustomEvent('agent:block-render-error', { detail: { blockId: this.props.blockId } })
    );
  }

  render() {
    if (this.state.failed) {
      return <Alert severity="warning">此数据块渲染失败，其他研究内容不受影响。</Alert>;
    }
    return this.props.children;
  }
}
