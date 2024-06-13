import { createWriteStream } from "fs";
import request from "request";
export function isNotEmpty(param) {
  return param !== undefined && param !== null && param !== "";
}
export function isFilled(param) {
  return param !== undefined && param !== null && param.length > 0;
}
export function isNotFilled(param) {
  return param !== undefined && param !== null && param.length === 0;
}
export function isUsable(param) {
  return param !== undefined && param !== null;
}
export function isNull(param) {
  return param !== undefined && param === null;
}
export function isUndefined(param) {
  return param === undefined;
}

export function median(values) {
  if (values.length === 0) throw new Error("No inputs");
  values.sort((a, b) => a - b);
  var half = Math.floor(values.length / 2);
  if (values.length % 2) return values[half];
  return (values[half - 1] + values[half]) / 2.0;
}

export async function download(uri, filename, callback) {
  if (this.isUsable(uri))
    request(uri)
      .pipe(createWriteStream(`./temp/${filename}`))
      .on("close", callback);
  else return null;
  // })
}
