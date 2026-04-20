import md5 from "blueimp-md5";

export function hashMd5(value: string): string {
  return md5(String(value || ""));
}

export function verifyMd5(plaintext: string, hash: string): boolean {
  return hashMd5(plaintext) === hash;
}
