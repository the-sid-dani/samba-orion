export type FormatResult = {
  summaryForModel: string;
  structuredForUI?: unknown;
};

const MAX_SUMMARY_LEN = 1600; // ~1–2KB, safe for voice prompting

const clamp = (s: string, max = MAX_SUMMARY_LEN) =>
  s.length > max ? s.slice(0, max - 3) + "..." : s;

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "");

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const pickKeys = (obj: any, keys: string[]) => {
  const out: Record<string, unknown> = {};
  for (const k of keys)
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  return out;
};

const sampleList = <T>(arr: T[], n = 3) => arr.slice(0, Math.max(0, n));

// Generic fallback summarizer for any tool result structure
export function genericFormatter(result: any): FormatResult {
  try {
    if (Array.isArray(result)) {
      const items = sampleList(result, 3)
        .map((it, i) => `- ${i + 1}. ${summarizeObject(it)}`)
        .join("\n");
      return {
        summaryForModel: clamp(items || "No items."),
        structuredForUI: result,
      };
    }

    if (result && typeof result === "object") {
      // Common shapes: results list
      if (Array.isArray(result.results)) {
        const items = sampleList(result.results, 3)
          .map((it: any, i: number) => {
            const title = it.title || it.name || "(untitled)";
            const date = formatDate(it.publishedDate || it.date);
            const url = it.url || it.link || "";
            const text = (
              it.text ||
              it.snippet ||
              it.description ||
              ""
            ).toString();
            return `${i + 1}. ${title}${date ? ` (${date})` : ""}${url ? `\n   ${url}` : ""}${
              text ? `\n   ${clamp(stripHtml(text), 200)}` : ""
            }`;
          })
          .join("\n");
        return {
          summaryForModel: clamp(items || "No results."),
          structuredForUI: result,
        };
      }

      // Table/series heuristic
      if (
        Array.isArray((result as any).data) &&
        Array.isArray((result as any).columns)
      ) {
        const rows = (result as any).data?.length ?? 0;
        const cols = (result as any).columns?.join(", ") ?? "";
        const first = (result as any).data?.[0];
        const sample = first ? JSON.stringify(first).slice(0, 200) : "";
        const msg = `Table: ${rows} rows, columns: ${cols}${sample ? `\nSample: ${sample}` : ""}`;
        return { summaryForModel: clamp(msg), structuredForUI: result };
      }

      // HTTP/JSON-ish
      const topKeys = Object.keys(result).slice(0, 6).join(", ");
      const preview = JSON.stringify(
        pickKeys(result, Object.keys(result).slice(0, 3)),
      ).slice(0, 200);
      const msg = `Object with keys: ${topKeys}${preview ? `\nPreview: ${preview}` : ""}`;
      return { summaryForModel: clamp(msg), structuredForUI: result };
    }

    // Primitive
    return { summaryForModel: clamp(String(result)), structuredForUI: result };
  } catch (_e) {
    return {
      summaryForModel: "Tool executed successfully.",
      structuredForUI: result,
    };
  }
}

function summarizeObject(it: any): string {
  if (!it) return "(empty)";
  if (typeof it !== "object") return clamp(String(it), 200);
  const title = it.title || it.name || "(untitled)";
  const date = formatDate(it.publishedDate || it.date);
  const url = it.url || it.link || "";
  const text = (it.text || it.snippet || it.description || "").toString();
  return `${title}${date ? ` (${date})` : ""}${url ? `\n   ${url}` : ""}${
    text ? `\n   ${clamp(stripHtml(text), 160)}` : ""
  }`;
}

// Exa search specialization
export function exaFormatter(result: any): FormatResult {
  try {
    const items: any[] = Array.isArray(result?.results) ? result.results : [];
    if (items.length === 0) return genericFormatter(result);
    const lines = sampleList(items, 3)
      .map((r, i) => {
        const title = r.title || "(untitled)";
        const date = formatDate(r.publishedDate);
        const url = r.url || "";
        const text = (r.text || r.snippet || "").toString();
        return `${i + 1}. ${title}${date ? ` (${date})` : ""}${url ? `\n   ${url}` : ""}${
          text ? `\n   ${clamp(stripHtml(text), 220)}` : ""
        }`;
      })
      .join("\n");
    return {
      summaryForModel: clamp(lines || "No results."),
      structuredForUI: result,
    };
  } catch {
    return genericFormatter(result);
  }
}

// Chart/table specialization (artifact-style)
export function chartTableFormatter(result: any): FormatResult {
  try {
    const title = result?.title || result?.chartTitle || "(untitled)";
    const chartType = result?.chartType || result?.type || "chart";
    const dataPoints =
      result?.dataPoints || result?.chartData?.data?.length || 0;
    const cols = Array.isArray(result?.chartData?.columns)
      ? result.chartData.columns.join(", ")
      : Array.isArray(result?.columns)
        ? result.columns.join(", ")
        : undefined;
    let msg = `${chartType} "${title}" with ${dataPoints} data points`;
    if (cols) msg += `\nColumns: ${cols}`;
    return { summaryForModel: clamp(msg), structuredForUI: result };
  } catch {
    return genericFormatter(result);
  }
}

// HTTP formatter
export function httpFormatter(result: any): FormatResult {
  try {
    const status = result?.status ?? result?.statusCode ?? "(unknown)";
    const type = result?.headers?.["content-type"] || result?.contentType || "";
    const body = result?.body ?? result?.data ?? result?.json;
    const keys =
      body && typeof body === "object"
        ? Object.keys(body).slice(0, 6).join(", ")
        : "";
    const preview =
      body && typeof body === "object"
        ? JSON.stringify(body).slice(0, 200)
        : "";
    const msg = `HTTP ${status}${type ? ` (${type})` : ""}${keys ? `\nKeys: ${keys}` : ""}${
      preview ? `\nPreview: ${preview}` : ""
    }`;
    return { summaryForModel: clamp(msg), structuredForUI: result };
  } catch {
    return genericFormatter(result);
  }
}

// Code execution formatter
export function codeFormatter(result: any): FormatResult {
  try {
    const exit = result?.exitCode ?? 0;
    const stdout = clamp(String(result?.stdout ?? ""), 200);
    const stderr = result?.stderr ? clamp(String(result.stderr), 160) : "";
    const msg = `Process exited ${exit}${stdout ? `\nstdout: ${stdout}` : ""}${stderr ? `\nstderr: ${stderr}` : ""}`;
    return { summaryForModel: clamp(msg), structuredForUI: result };
  } catch {
    return genericFormatter(result);
  }
}

const registry: Record<string, (result: any) => FormatResult> = {
  // Web search / content
  webSearch: exaFormatter,
  webContent: exaFormatter,
  // Tables/charts
  create_bar_chart: chartTableFormatter,
  create_line_chart: chartTableFormatter,
  create_pie_chart: chartTableFormatter,
  create_area_chart: chartTableFormatter,
  create_scatter_chart: chartTableFormatter,
  create_radar_chart: chartTableFormatter,
  create_funnel_chart: chartTableFormatter,
  create_treemap_chart: chartTableFormatter,
  create_sankey_chart: chartTableFormatter,
  create_radial_bar_chart: chartTableFormatter,
  create_composed_chart: chartTableFormatter,
  create_geographic_chart: chartTableFormatter,
  create_gauge_chart: chartTableFormatter,
  create_calendar_heatmap: chartTableFormatter,
  create_ban_chart: chartTableFormatter,
  createTable: chartTableFormatter,
  // HTTP
  http: httpFormatter,
  // Code
  "mini-javascript-execution": codeFormatter,
  "python-execution": codeFormatter,
};

export function formatToolResult(toolName: string, result: any): FormatResult {
  const enabled =
    (process.env.VOICE_TOOL_FORMATTER_ENABLED ?? "true").toLowerCase() !==
    "false";
  if (!enabled)
    return {
      summaryForModel: clamp(JSON.stringify(result ?? "")),
      structuredForUI: result,
    };
  try {
    const fn = registry[toolName] ?? genericFormatter;
    const out = fn(result);
    out.summaryForModel = clamp(stripHtml(out.summaryForModel ?? ""));
    return out;
  } catch {
    const out = genericFormatter(result);
    out.summaryForModel = clamp(stripHtml(out.summaryForModel ?? ""));
    return out;
  }
}
