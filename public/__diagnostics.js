let reportIndex = 0;

function getValuesFromCallback(callback) {
  let values = {};

  callback((key, value) => {
    let canBeCloned = true;
    try {
      window.parent.postMessage({ name: "__garbage", data: value });
    } catch (err) {
      canBeCloned = false;
    }

    if (canBeCloned) {
      values[key] = value;
    } else {
      values[key] = "CANNOT BE CLONED";
    }
  });

  return values;
}

export function __reportValuesBeforeStatement(startLine, endLine, callback) {
  // console.log("Before statement:", startLine, endLine, values);
  const values = getValuesFromCallback(callback);

  window.parent.postMessage({
    name: "__reportValuesBeforeStatement",
    data: { index: reportIndex++, startLine, endLine, values },
  });
}

export function __reportValuesAfterStatement(startLine, endLine, callback) {
  // console.log("After statement:", startLine, endLine, values);
  const values = getValuesFromCallback(callback);

  window.parent.postMessage({
    name: "__reportValuesAfterStatement",
    data: { index: reportIndex++, startLine, endLine, values },
  });
}

export const __console = {
  ...console,
  log: (...args) => {
    console.log("Log:", ...args);
    window.parent.postMessage({
      name: "__console",
      data: { args, mostRecentReportIndex: reportIndex },
    });
  },
};
