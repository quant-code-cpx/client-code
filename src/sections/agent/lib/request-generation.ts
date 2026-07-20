let requestGeneration = 0;

export function nextAgentRequestGeneration(): number {
  requestGeneration += 1;
  return requestGeneration;
}
