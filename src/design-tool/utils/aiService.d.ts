// Type declaration for the JS AI service module
declare module "@/design-tool/utils/aiService" {
  export function generateDesignJsonFromPrompt(
    prompt: string,
    style: string,
    canvasWidth: number,
    canvasHeight: number,
    productInfo: string,
    referenceImages?: unknown[]
  ): Promise<unknown[]>;
}
