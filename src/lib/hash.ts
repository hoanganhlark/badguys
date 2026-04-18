import md5 from "blueimp-md5";

export function hashMd5(value: string): string {
  return md5(String(value || ""));
}
