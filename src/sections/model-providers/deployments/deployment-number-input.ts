import type { WheelEvent } from 'react';

export function blurDeploymentNumberInputOnWheel(event: WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
}
