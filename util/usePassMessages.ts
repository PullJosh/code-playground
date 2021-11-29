import { useEffect } from "react";

export default function usePassMessages(
  destinationWindow: Window | null = null,
  funcs: { [name: string]: (data: any) => void } = {}
) {
  useEffect(() => {
    const onMessage = ({ data: { name, data } }) => {
      if (funcs[name]) {
        funcs[name](data);
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [funcs]);

  const send = (name: string, data: any = null) => {
    if (destinationWindow) {
      destinationWindow.postMessage({ name, data });
    } else {
      console.log("Failed to send message: no destinationWindow", name, data);
    }
  };

  return send;
}
