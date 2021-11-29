import { useState, useRef } from "react";
import usePassMessages from "../util/usePassMessages";
import Editor, { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import classNames from "classnames";
import { Switch } from "@headlessui/react";

const d_ts = ""; /*`
export declare class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  gameObjects: never[];
  loopFunctions: never[];
  keysPressed: Set<unknown>;
  listeners: never[];
  constructor(canvas: HTMLCanvasElement);
  play(): void;
  frame(): void;
  render(): void;
  addGameObject(object: any): void;
  loop(fn: any): void;
  keyPressed(key: any): boolean;
  onKeyDown(key: any, fn: any): void;
  onKeyUp(key: any, fn: any): void;
}
declare class GameObject {
  constructor(game: any);
  render(canvas: any, ctx: any): void;
}
export declare class Player extends GameObject {
  constructor(game: any, x?: number, y?: number);
  render(canvas: any, ctx: any): void;
}
export {};
`;*/

const defaultCode = `let i = 0;
while (i < 10) {
    console.log(i * i);
    i++;
}`;

type ValueReport = any;

interface ValuesReport {
  [key: string]: ValueReport;
}

interface StatementReport {
  startLine: number;
  endLine: number;

  indexBefore: number | null;
  valuesBefore: ValuesReport | null;

  indexAfter: number | null;
  valuesAfter: ValuesReport | null;
}

interface Log {
  args: any[];
  mostRecentReportIndex: number;
}

export default function Index() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [statementReports, setStatementReports] = useState<StatementReport[]>(
    []
  );

  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const send = usePassMessages(iframe?.contentWindow, {
    __console: ({ args, mostRecentReportIndex }: Log) => {
      setLogs((logs) => [...logs, { args, mostRecentReportIndex }]);
    },
    __reportValuesBeforeStatement: ({
      index,
      startLine,
      endLine,
      values,
    }: {
      index: number;
      startLine: number;
      endLine: number;
      values: ValuesReport;
    }) => {
      setStatementReports((statementReports) => {
        const existingReportIndex = statementReports.findIndex(
          (report) =>
            report.startLine === startLine &&
            report.endLine === endLine &&
            report.indexAfter === index + 1
        );

        if (existingReportIndex > -1) {
          return [
            ...statementReports.slice(0, existingReportIndex),
            {
              ...statementReports[existingReportIndex],
              indexBefore: index,
              valuesBefore: values,
            },
            ...statementReports.slice(existingReportIndex + 1),
          ];
        }

        return [
          ...statementReports,
          {
            startLine,
            endLine,

            indexBefore: index,
            valuesBefore: values,

            indexAfter: null,
            valuesAfter: null,
          },
        ].sort(
          (a, b) =>
            Math.min(a.indexBefore ?? Infinity, a.indexAfter ?? Infinity) -
            Math.min(b.indexBefore ?? Infinity, b.indexAfter ?? Infinity)
        );
      });
    },
    __reportValuesAfterStatement: ({
      index,
      startLine,
      endLine,
      values,
    }: {
      index: number;
      startLine: number;
      endLine: number;
      values: ValuesReport;
    }) => {
      setStatementReports((statementReports) => {
        const existingReportIndex = statementReports.findIndex(
          (report) =>
            report.startLine === startLine &&
            report.endLine === endLine &&
            report.indexBefore === index - 1
        );

        if (existingReportIndex > -1) {
          return [
            ...statementReports.slice(0, existingReportIndex),
            {
              ...statementReports[existingReportIndex],
              indexAfter: index,
              valuesAfter: values,
            },
            ...statementReports.slice(existingReportIndex + 1),
          ];
        }

        return [
          ...statementReports,
          {
            startLine,
            endLine,

            indexBefore: null,
            valuesBefore: null,

            indexAfter: index,
            valuesAfter: values,
          },
        ].sort(
          (a, b) =>
            Math.min(a.indexBefore ?? Infinity, a.indexAfter ?? Infinity) -
            Math.min(b.indexBefore ?? Infinity, b.indexAfter ?? Infinity)
        );
      });
    },
  });

  const [code, setCode] = useState(defaultCode);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const lineDecorationsRef = useRef<string[]>([]);

  const focusLine = (
    startLineNumber: number | null,
    endLineNumber: number | null = startLineNumber,
    label: string | null = null
  ) => {
    lineDecorationsRef.current =
      editorRef.current?.deltaDecorations(
        lineDecorationsRef.current,
        startLineNumber === null || endLineNumber === null
          ? []
          : [
              {
                range: new (monacoRef.current as any as Monaco).Range(
                  startLineNumber,
                  1,
                  endLineNumber,
                  1
                ),
                options: {
                  isWholeLine: true,
                  className: "bg-gray-100",
                  marginClassName: "bg-gray-100",
                  after: label
                    ? {
                        content: label,
                        inlineClassName: "absolute text-gray-400 top-0 right-4",
                      }
                    : undefined,
                },
              },
            ]
      ) ?? [];
  };

  const [selectedTab, setSelectedTab] = useState("console");

  const run = () => {
    if (iframe?.contentWindow) {
      setLogs([]);
      setStatementReports([]);

      const callback = () => {
        send("runCode", { code });
        iframe.focus();
        iframe.removeEventListener("load", callback);
      };

      iframe.addEventListener("load", callback);

      iframe.contentWindow.location.reload();
    } else {
      console.error("Could not run");
    }
  };

  const [focusedReport, setFocusedReport] = useState<StatementReport | null>(
    null
  );

  const focusReport = (report: StatementReport) => {
    setFocusedReport(report);
    focusLine(
      report.startLine,
      report.endLine
      // Object.entries(reportedValues[index].values)
      //   .map(([name, value]) => `${name}: ${JSON.stringify(value)}`)
      //   .join(", ")
    );
  };

  const unfocusReport = (report: StatementReport) => {
    if (focusedReport === report) {
      setFocusedReport(null);
      focusLine(null);
    }
  };

  function getReportByIndex(index: number) {
    return statementReports.find(
      (report) => report.indexBefore === index || report.indexAfter === index
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col">
      <nav className="flex-grow-0 col-span-2 shadow z-10 px-4 py-2">
        Code Playground
      </nav>
      <div className="flex-grow grid grid-cols-2 items-stretch divide-x">
        <div className="flex flex-col divide-y">
          <Editor
            height="70%"
            className="flex-grow flex-shrink"
            language="javascript"
            value={code}
            onChange={(value, event) => {
              setCode(value ?? "");
            }}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              monacoRef.current = monaco;

              monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
                { noLib: true, allowNonTsExtensions: true }
              );

              monaco.languages.typescript.javascriptDefaults.addExtraLib(
                d_ts,
                "http://localhost:3000/mazeGame.d.ts"
              );

              // monaco.languages.registerCompletionItemProvider("javascript", {
              //   provideCompletionItems: (model, position) => {
              //     const word = model.getWordUntilPosition(position);

              //     const range = {
              //       startLineNumber: position.lineNumber,
              //       endLineNumber: position.lineNumber,
              //       startColumn: word.startColumn,
              //       endColumn: word.endColumn,
              //     };

              //     return {
              //       suggestions: [
              //         {
              //           range,
              //           label: "await move();",
              //           kind: monaco.languages.CompletionItemKind.Function,
              //           documentation: "Move",
              //           insertText: "await move();",
              //         },
              //         {
              //           range,
              //           label: 'await turn("left");',
              //           kind: monaco.languages.CompletionItemKind.Function,
              //           documentation: "Turn left",
              //           insertText: 'await turn("${1:left}");',
              //           insertTextRules:
              //             monaco.languages.CompletionItemInsertTextRule
              //               .InsertAsSnippet,
              //         },
              //         {
              //           range,
              //           label: 'await turn("right");',
              //           kind: monaco.languages.CompletionItemKind.Function,
              //           documentation: "Turn right",
              //           insertText: 'await turn("${1:right}");',
              //           insertTextRules:
              //             monaco.languages.CompletionItemInsertTextRule
              //               .InsertAsSnippet,
              //         },
              //       ],
              //     };
              //   },
              // });
            }}
            options={{
              minimap: {
                enabled: false,
              },
              scrollBeyondLastLine: false,
              fontSize: 14,
              formatOnType: true,
              padding: {
                top: 8,
              },
            }}
          />
          <div className="flex-grow flex-shrink flex flex-col bg-gray-100 divide-y">
            <div className="flex items-stretch justify-between">
              <div className="flex items-stretch px-3 space-x-3">
                <button
                  className={classNames("py-2 border-b-2 -mb-px z-10", {
                    "border-blue-800": selectedTab === "timeline",
                    "border-transparent": selectedTab !== "timeline",
                  })}
                  onClick={() => setSelectedTab("timeline")}
                >
                  Timeline
                </button>
                <button
                  className={classNames("py-2 border-b-2 -mb-px z-10", {
                    "border-blue-800": selectedTab === "console",
                    "border-transparent": selectedTab !== "console",
                  })}
                  onClick={() => setSelectedTab("console")}
                >
                  Console
                  {logs.length > 0 && (
                    <span className="ml-2 bg-gray-300 px-2 py-px relative -top-px rounded-full text-xs">
                      {logs.length}
                    </span>
                  )}
                </button>
                <button
                  className={classNames("py-2 border-b-2 -mb-px z-10", {
                    "border-blue-800": selectedTab === "actions",
                    "border-transparent": selectedTab !== "actions",
                  })}
                  onClick={() => setSelectedTab("actions")}
                >
                  Actions
                </button>
              </div>
              {/* <label className="flex items-center px-3 py-1 space-x-2 cursor-pointer">
                <Switch
                  checked={slowMode}
                  onChange={setSlowMode}
                  className={classNames(
                    "relative flex h-6 w-10 p-1 rounded-full transition-colors ease-in-out duration-200",
                    {
                      "bg-blue-800": slowMode,
                      "bg-blue-600": !slowMode,
                    }
                  )}
                >
                  <span className="sr-only">Use slow mode</span>
                  <span
                    aria-hidden="true"
                    className={classNames(
                      "bg-white h-4 w-4 rounded-full transform pointer-events-none transition ease-in-out duration-200",
                      {
                        "translate-x-4": slowMode,
                        "translate-x-0": !slowMode,
                      }
                    )}
                  />
                </Switch>
                <span className="select-none text-blue-900">
                  Slow motion: {slowMode ? "on" : "off"}
                </span>
              </label> */}
              <div className="flex items-stretch">
                {/* <button
                  className="px-4 py-2 text-gray-800"
                  onClick={() => pause()}
                >
                  Pause
                </button> */}
                <button
                  className="text-white bg-green-600 px-8 py-2 active:bg-green-700"
                  onClick={() => {
                    editorRef?.current
                      ?.getAction("editor.action.formatDocument")
                      .run();
                    run();
                  }}
                >
                  Run
                </button>
              </div>
            </div>
            <div className="flex-grow flex-shrink h-48 overflow-auto flex items-stretch">
              {selectedTab === "timeline" && (
                <>
                  {statementReports.length === 0 && (
                    <div className="px-4 py-2 text-gray-500">
                      No timeline entries yet.
                    </div>
                  )}
                  {statementReports.length > 0 && (
                    <div className="flex">
                      {statementReports.map((report, index) => (
                        <div
                          key={index}
                          className="flex justify-center p-2 h-full hover:bg-gray-300"
                          // title={JSON.stringify(values)}
                          onMouseEnter={() => {
                            focusReport(report);
                          }}
                          onMouseLeave={() => {
                            unfocusReport(report);
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-full bg-gray-800"
                            style={{
                              transform: `translateY(${
                                150 * (report.startLine - 1)
                              }%)`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {selectedTab === "console" && (
                <div className="flex-grow">
                  {logs.length === 0 && (
                    <div className="px-4 py-2 text-gray-500">No logs yet.</div>
                  )}
                  <div className="divide-y">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className="px-3 py-1 font-mono text-sm hover:bg-gray-200"
                        onMouseEnter={() => {
                          focusReport(
                            getReportByIndex(
                              log.mostRecentReportIndex
                            ) as StatementReport
                          );
                        }}
                        onMouseLeave={() => {
                          unfocusReport(
                            getReportByIndex(
                              log.mostRecentReportIndex
                            ) as StatementReport
                          );
                        }}
                      >
                        {log.args.map(String).join(" ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTab === "actions" && (
                <div className="px-4 py-2 text-gray-500">
                  No actions available.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col divide-y">
          <iframe
            className="w-full h-full flex-grow"
            ref={setIframe}
            src="/preview-frame"
          />
          <div className="flex-grow flex-shrink flex flex-col bg-gray-100 divide-y">
            <div className="flex-grow flex-shrink h-72 overflow-y-auto">
              <div className="font-sans font-medium text-base">
                <div className="grid grid-cols-4 divide-x border-b">
                  <div className="col-span-1 px-4 py-2">Variable</div>
                  <div className="col-span-3 px-4 py-2">Value</div>
                </div>
              </div>
              <div className="font-mono text-sm">
                {focusedReport &&
                  Object.entries(diffReportValues(focusedReport)).map(
                    ([name, { before, after }]) => {
                      if (before === null) {
                        return (
                          <ValueRow
                            key={name}
                            status="add"
                            name={name}
                            value={after}
                          />
                        );
                      }

                      if (after === null) {
                        return (
                          <ValueRow
                            key={name}
                            status="remove"
                            name={name}
                            value={before}
                          />
                        );
                      }

                      if (before === after) {
                        return (
                          <ValueRow
                            key={name}
                            status="default"
                            name={name}
                            value={before}
                          />
                        );
                      }

                      return (
                        <>
                          <ValueRow
                            key={`${name} before`}
                            status="remove"
                            name={name}
                            value={before}
                          />
                          <ValueRow
                            key={`${name} after`}
                            status="add"
                            name={name}
                            value={after}
                          />
                        </>
                      );
                    }
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueRow({
  name,
  value,
  status,
}: {
  name: string;
  value: ValueReport;
  status: "default" | "add" | "remove";
}) {
  return (
    <div
      className={classNames(
        "grid grid-cols-4 divide-x border-b bg-opacity-50",
        {
          "bg-green-200 text-green-800 divide-green-200": status === "add",
          "bg-red-200 text-red-800 divide-green-200": status === "remove",
        }
      )}
    >
      <div className="col-span-1 px-4 py-1">
        {status === "add" && <span className="mr-2">+</span>}
        {status === "remove" && <span className="mr-2">-</span>}
        {name}
      </div>
      <div className="col-span-3 px-4 py-1">{JSON.stringify(value)}</div>
    </div>
  );
}

interface ValuesReportDiff {
  [key: string]: {
    before: ValueReport | null;
    after: ValueReport | null;
  };
}

function diffReportValues(report: StatementReport) {
  const valuesBefore =
    report.valuesBefore ?? (report.valuesAfter as ValuesReport);
  const valuesAfter =
    report.valuesAfter ?? (report.valuesBefore as ValuesReport);

  const keys = new Set([
    ...Object.keys(valuesBefore),
    ...Object.keys(valuesAfter),
  ]);

  let result: ValuesReportDiff = {};
  for (const key of Array.from(keys)) {
    result[key] = {
      before: valuesBefore[key] ?? null,
      after: valuesAfter[key] ?? null,
    };
  }

  return result;
}
