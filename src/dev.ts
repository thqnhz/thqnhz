/*
 * This file is used to run both the bundler in watch mode
 * and the http server in development environment.
 */

const bundler = new Deno.Command("deno", {
    args: ["bundle", "--watch", "src/main.ts", "-o", "docs/bundle.js"],
    stdout: "piped",
    stderr: "piped",
});

const server = new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-net", "jsr:@std/http@1/file-server", "docs/"],
    stdout: "piped",
    stderr: "piped",
});

const bundlerProc = bundler.spawn();
const serverProc = server.spawn();

async function pipeOutput(stream: ReadableStream<Uint8Array>, prefix: string) {
    const decoder = new TextDecoder();
    let buf = "";
    for await (const chunk of stream) {
        buf += decoder.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
            if (line) console.log(`${prefix} ${line}`)
        }
    }
    if (buf) console.log(`${prefix} ${buf}`)
}

Promise.all([
    pipeOutput(bundlerProc.stdout!, "[bundler]"),
    pipeOutput(serverProc.stdout!, "[ server]"),
    pipeOutput(bundlerProc.stderr!, "[bundler]"),
    pipeOutput(serverProc.stderr!, "[ server]"),
]);

Deno.addSignalListener("SIGINT", () => {
    console.log("\nShutting down...");
    try { bundlerProc.kill("SIGTERM") } catch { /* Hey, bet you didn't know about this video: */ }
    try { serverProc.kill("SIGTERM")  } catch { /* https://youtu.be/dQw4w9WgXcQ */ }
    Deno.exit(0);
});

await Promise.all([
    bundlerProc.status,
    serverProc.status,
]);

