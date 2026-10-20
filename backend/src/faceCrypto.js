import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const keyFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/face.key");
let memoryKey = null;

function key() {
  if (memoryKey) return memoryKey;
  const fromEnv = String(process.env.FACE_DATA_KEY || "").trim();
  if (fromEnv) {
    const envKey = Buffer.from(fromEnv, "hex");
    if (envKey.length === 32) return envKey;
    const error = new Error("FACE_DATA_KEY debe ser una llave hexadecimal de 32 bytes. El acceso no se concede.");
    error.status = 503;
    throw error;
  }
  if (!fs.existsSync(keyFile)) {
    const created = randomBytes(32);
    try {
      fs.mkdirSync(path.dirname(keyFile), { recursive: true });
      fs.writeFileSync(keyFile, created.toString("hex"), { mode: 0o600 });
    } catch (error) {
      if (!["EROFS", "EPERM", "EACCES", "ENOENT"].includes(error.code)) throw error;
      memoryKey = created;
      return memoryKey;
    }
  }
  const raw = Buffer.from(fs.readFileSync(keyFile, "utf8").trim(), "hex");
  if (raw.length !== 32) {
    const error = new Error("La llave de los datos faciales no es válida. El acceso no se concede.");
    error.status = 503;
    throw error;
  }
  memoryKey = raw;
  return raw;
}

export function encryptTemplate(vector) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(vector), "utf8"), cipher.final()]);
  return {
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: data.toString("hex"),
  };
}

export function decryptTemplate(payload) {
  if (!payload?.iv || !payload?.tag || !payload?.data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(payload.iv, "hex"));
    decipher.setAuthTag(Buffer.from(payload.tag, "hex"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(payload.data, "hex")),
      decipher.final(),
    ]).toString("utf8");
    const vector = JSON.parse(plain);
    if (!Array.isArray(vector) || vector.length !== 128 || vector.some((value) => !Number.isFinite(value))) return null;
    return vector;
  } catch {
    return null;
  }
}
