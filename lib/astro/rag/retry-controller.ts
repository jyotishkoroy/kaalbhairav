export type RetryControllerResult = {
  retried: boolean;
  fallbackUsed: boolean;
};

export async function runRagRetryController(): Promise<RetryControllerResult> {
  return { retried: false, fallbackUsed: true };
}
