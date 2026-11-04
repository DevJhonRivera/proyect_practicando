import childProcess from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function generarComprobantePdf(html) {
  const navegador = process.env.CHROMIUM_BIN || (process.platform === "win32"
    ? join(process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)", "Microsoft/Edge/Application/msedge.exe")
    : "chromium");
  const directorio = await mkdtemp(join(tmpdir(), "polarizados-comprobante-"));
  try {
    const origen = join(directorio, "comprobante.html");
    const salida = join(directorio, "comprobante.pdf");
    await writeFile(origen, html, { encoding: "utf8", mode: 0o600 });
    const argumentos = [
      "--headless", "--no-first-run", "--disable-gpu", "--disable-dev-shm-usage", "--disable-background-networking",
      ...(process.env.CHROMIUM_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
      "--no-pdf-header-footer", `--user-data-dir=${join(directorio, "perfil")}`,
      `--print-to-pdf=${salida}`, pathToFileURL(origen).href,
    ];
    await new Promise((resolve, reject) => {
      childProcess.execFile(navegador, argumentos, { timeout: 20000, windowsHide: true },
        (error) => error ? reject(error) : resolve());
    });
    return await readFile(salida);
  } catch (error) {
    throw new Error("No se pudo generar el PDF del comprobante. Revise la instalación de Chromium en el backend.", { cause: error });
  } finally {
    await rm(directorio, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  }
}
