# Claude Enterprise Assistant — SAP Analytics Cloud Custom Widget

A custom SAC widget that embeds Claude AI as an interactive chat assistant inside SAP Analytics Cloud dashboards. Pass live table data from your SAC story to Claude and ask financial analysis questions in natural language.

---

## Files

| File | Description |
|------|-------------|
| `ClaudeWidget.js` | Main runtime widget (Web Component) rendered on the SAC canvas |
| `aps_claude.js` | Builder panel (styling panel) for configuring widget properties in SAC designer |
| `claude_aps.json` | Widget manifest — registers the widget in SAC and defines all properties/methods |

---

## Setup

### 1. Enable GitHub Pages

After uploading files to this repo:

1. Go to **Settings → Pages**
2. Under **Branch**, select `main` → `/ (root)` → click **Save**
3. Your files will be live at:
   ```
   https://jayram1990.github.io/Claude-Code/ClaudeWidget.js
   https://jayram1990.github.io/Claude-Code/aps_claude.js
   ```

### 2. Register the Widget in SAC

1. In SAP Analytics Cloud, go to **Main Menu → System → Administration → Custom Widgets**
2. Click **+ Add custom widget**
3. Upload `claude_aps.json`
4. The widget will appear in the widget panel under **"Claude Enterprise Assistant"**

### 3. Configure the Widget

Once placed on a SAC story canvas, open the builder panel and set:

| Property | Description |
|----------|-------------|
| **Header Label** | Title shown at the top of the chat widget |
| **AI Model** | Claude model to use (Sonnet / Opus / Haiku) |
| **Welcome Message** | Greeting text shown when the widget loads |
| **Temperature** | `0.0` = precise, `1.0` = creative |
| **Max Tokens** | Maximum response length (default: 1000) |
| **Proxy API URL** | URL of your backend proxy that forwards requests to the Anthropic API |
| **API Key** | API key for your backend proxy |

> **Important:** Never call the Anthropic API directly from the widget. Always route through a backend proxy to keep your API key secure.

### 4. Pass Data from SAC to Claude

In a SAC script (e.g. a button's `onClick`), call `setTableData()` to send your dataset to the widget:

```js
var data = Chart_1.getDataSource().getData();
ClaudeChat_1.setTableData(JSON.stringify(data));
```

Once data is loaded, the chat input unlocks and users can start asking questions.

---

## API Configuration

The widget supports two modes depending on your setup:

### Option A — Anthropic API directly (recommended)

| Field | Value |
|-------|-------|
| **Proxy API URL** | `https://api.anthropic.com/v1/messages` |
| **API Key** | Your Anthropic API key (`sk-ant-...`) from [console.anthropic.com](https://console.anthropic.com) |

The widget auto-detects `anthropic.com` URLs and sends the correct headers (`x-api-key`, `anthropic-version`).

### Option B — Custom backend proxy

If you route through your own proxy:

| Field | Value |
|-------|-------|
| **Proxy API URL** | `https://your-backend.com/api/chat` |
| **API Key** | Your backend's API key |

Your backend should forward requests to `https://api.anthropic.com/v1/messages` and return the response as-is. Set CORS headers to allow requests from your SAC tenant domain.

---

## Models Available

| SAC Builder Label | Model ID |
|-------------------|----------|
| Claude Sonnet 4.6 | `claude-sonnet-4-6` |
| Claude Opus 4.8 | `claude-opus-4-8` |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` |

---

## License

MIT
