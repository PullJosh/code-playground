import usePassMessages from "../util/usePassMessages";
import { transform } from "@babel/standalone";
import babelPluginDiagnostics from "../util/babel-plugin-diagnostics";

export default function PreviewFrame() {
  usePassMessages(global.parent, {
    runCode: async ({ code }: { code: string }) => {
      const { code: transformedCode } = transform(code, {
        plugins: [babelPluginDiagnostics],
        retainLines: true,
      });

      console.log(transformedCode);

      const blob = new Blob([transformedCode ?? ""], {
        type: "text/javascript",
      });
      const blobURL = URL.createObjectURL(blob);

      await import(/* webpackIgnore: true */ blobURL);
    },
  });

  return null;
}
