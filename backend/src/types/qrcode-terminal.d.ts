declare module 'qrcode-terminal' {
  interface GenerateOptions {
    small?: boolean;
  }
  function generate(text: string, options?: GenerateOptions, callback?: (code: string) => void): void;
  function setErrorLevel(level: 'L' | 'M' | 'Q' | 'H'): void;
  export { generate, setErrorLevel };
  const qrcode: {
    generate: typeof generate;
    setErrorLevel: typeof setErrorLevel;
  };
  export default qrcode;
}
