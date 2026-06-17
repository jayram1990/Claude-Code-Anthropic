(function() {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; width: 100%; height: 100%; box-sizing: border-box; }
            .chat-container { display: flex; flex-direction: column; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.04); overflow: hidden; height: 100%; }
            .chat-header { padding: 14px 18px; background: #0f172a; color: #ffffff; font-weight: 600; font-size: 14px; }
            .chat-area { flex-grow: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; }
            .msg { max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; word-wrap: break-word; }
            .user-msg { align-self: flex-end; background: #2563eb; color: #ffffff; border-bottom-right-radius: 2px; }
            .ai-msg { align-self: flex-start; background: #ffffff; color: #1e293b; border-bottom-left-radius: 2px; border: 1px solid #e2e8f0; }
            .system-msg { align-self: center; font-size: 11px; color: #64748b; font-style: italic; background: transparent; text-align: center; }
            .input-area { display: flex; padding: 12px; border-top: 1px solid #e2e8f0; background: #ffffff; align-items: center; }
            input { flex-grow: 1; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 10px 16px; outline: none; font-size: 13px; }
            input:focus { border-color: #2563eb; }
            button { background: #2563eb; color: #ffffff; border: none; border-radius: 50%; width: 36px; height: 36px; margin-left: 10px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
            button:disabled { background: #cbd5e1; cursor: not-allowed; }
        </style>
        <div class="chat-container">
            <div class="chat-header" id="headerDom">Claude Analytics</div>
            <div class="chat-area" id="boxDom"></div>
            <div class="input-area">
                <input type="text" id="inputDom" placeholder="Ask Claude about your data..." />
                <button id="btnDom">➔</button>
            </div>
        </div>
    `;

    class ClaudeRuntimeWidget extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));

            this.$headerDom = this._shadowRoot.getElementById("headerDom");
            this.$boxDom = this._shadowRoot.getElementById("boxDom");
            this.$inputDom = this._shadowRoot.getElementById("inputDom");
            this.$btnDom = this._shadowRoot.getElementById("btnDom");

            this._settings = { model: "claude-sonnet-4-6", temperature: 0.2, maxTokens: 1000, headerLabel: "Claude Analytics", welcomeMsg: "", apiUrl: "", apiKey: "" };
            this.sacContextData = null;
            this.conversationHistory = [];

            this.$btnDom.addEventListener("click", () => this.executePrompt());
            this.$inputDom.addEventListener("keypress", (e) => { if(e.key === 'Enter') this.executePrompt(); });
        }

        connectedCallback() {
            // Replicating your specific React Component hook state parsing logic from cai.js
            try {
                if (window.commonApp) {
                    let outline = commonApp.getShell().findElements(true, el => el.hasStyleClass && el.hasStyleClass("sapAppBuildingOutline"))[0];
                    if (outline && outline.getReactProps) {
                        let processReactStore = state => {
                            let layoutComponents = {};
                            let instances = state.globalState.instances;
                            let activeApp = instances.app["[{\"app\":\"MAIN_APPLICATION\"}]"];
                            let internalNames = activeApp.names;

                            for (let key in internalNames) {
                                let obj = JSON.parse(key).pop();
                                let elementType = Object.keys(obj)[0];
                                let targetId = obj[elementType];
                                layoutComponents[targetId] = { type: elementType, name: internalNames[key] };
                            }

                            let metaString = JSON.stringify({ components: layoutComponents, vars: activeApp.globalVars });
                            if (metaString !== this.metadata) {
                                this.metadata = metaString;
                                this.dispatchEvent(new CustomEvent("propertiesChanged", { detail: { properties: { metadata: metaString } } }));
                            }
                        };

                        let props = outline.getReactProps();
                        if (props && props.store) {
                            props.store.subscribe({ effect: state => { processReactStore(state); return { result: 1 }; } });
                        }
                    }
                }
            } catch(err) { console.warn("SAC state registration bypass:", err); }
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._settings = { ...this._settings, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            if (changedProperties["headerLabel"]) this.$headerDom.innerText = this._settings.headerLabel;
            if (changedProperties["apiUrl"]) this._settings.apiUrl = changedProperties["apiUrl"];
            if (changedProperties["apiKey"]) this._settings.apiKey = changedProperties["apiKey"];
            if (changedProperties["model"]) this._settings.model = changedProperties["model"];
            if (changedProperties["temperature"]) this._settings.temperature = changedProperties["temperature"];
            if (changedProperties["maxTokens"]) this._settings.maxTokens = changedProperties["maxTokens"];
            if (this.$boxDom.children.length === 0 && this._settings.welcomeMsg) {
                this.printMessage("ai-msg", this._settings.welcomeMsg);
            }
        }

        setTableData(dataString) {
            if (dataString && dataString.length > 0) {
                this.sacContextData = dataString;
                this.$inputDom.disabled = false;
                this.$btnDom.disabled = false;
                this.printMessage("system-msg", "Data loaded! Ask Claude to analyse your market data.");
            } else {
                this.printMessage("system-msg", "No data received from table.");
            }
        }

        printMessage(cssClass, text) {
            const row = document.createElement("div");
            row.classList.add("msg", cssClass);
            row.innerText = text;
            this.$boxDom.appendChild(row);
            this.$boxDom.scrollTop = this.$boxDom.scrollHeight;
        }

        async executePrompt() {
            const prompt = this.$inputDom.value.trim();
            if (!prompt) return;

            this.printMessage("user-msg", prompt);
            this.$inputDom.value = "";
            this.conversationHistory.push({ role: "user", content: prompt });

            const systemPrompt = `You are a financial model analyst interpreting live SAC market data. Analyse and answer questions based on this data:\n${this.sacContextData}`;
            this.printMessage("system-msg", "Claude is calculating table context...");

            const apiUrl = this._settings.apiUrl;
            const apiKey = this._settings.apiKey;

            if (!apiUrl || !apiKey) {
                this.$boxDom.removeChild(this.$boxDom.lastChild);
                this.printMessage("system-msg", "API URL and API Key must be configured in widget properties.");
                return;
            }

            try {
                const isAnthropic = apiUrl.includes("anthropic.com");
                const isOpenRouter = apiUrl.includes("openrouter.ai");
                const headers = { "Content-Type": "application/json" };
                if (isAnthropic) {
                    headers["x-api-key"] = apiKey;
                    headers["anthropic-version"] = "2023-06-01";
                    headers["anthropic-dangerous-direct-browser-access"] = "true";
                } else {
                    headers["Authorization"] = `Bearer ${apiKey}`;
                }

                // OpenRouter uses OpenAI format: system message inside messages array, not top-level
                const requestBody = (isOpenRouter)
                    ? {
                        model: "anthropic/claude-sonnet-4-5",
                        messages: [{ role: "system", content: systemPrompt }, ...this.conversationHistory],
                        temperature: parseFloat(this._settings.temperature),
                        max_tokens: parseInt(this._settings.maxTokens)
                    }
                    : {
                        model: this._settings.model,
                        system: systemPrompt,
                        messages: this.conversationHistory,
                        temperature: parseFloat(this._settings.temperature),
                        max_tokens: parseInt(this._settings.maxTokens)
                    };

                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(requestBody)
                });

                this.$boxDom.removeChild(this.$boxDom.lastChild);

                if (!response.ok) {
                    this.printMessage("system-msg", `API error ${response.status}: ${response.statusText}`);
                    return;
                }

                const payload = await response.json();

                // Handle both Anthropic format (content[0].text) and OpenAI/OpenRouter format (choices[0].message.content)
                const responseText = payload.content && payload.content[0]
                    ? payload.content[0].text
                    : payload.choices && payload.choices[0]
                        ? payload.choices[0].message.content
                        : null;

                if (responseText) {
                    this.printMessage("ai-msg", responseText);
                    this.conversationHistory.push({ role: "assistant", content: responseText });
                } else {
                    const errorDetail = payload.error ? payload.error.message : "Unknown error";
                    this.printMessage("system-msg", `Error: ${errorDetail}`);
                }
            } catch (err) {
                if (this.$boxDom.lastChild.classList.contains("system-msg")) this.$boxDom.removeChild(this.$boxDom.lastChild);
                this.printMessage("system-msg", `Pipeline break: ${err.message}`);
            }
        }

        // Getter/Setters mirroring your structural parameters layout
        get metadata() { return this._settings.metadata; }
        set metadata(val) { this._settings.metadata = val; }
        get headerLabel() { return this._settings.headerLabel; }
        set headerLabel(val) { this._settings.headerLabel = val; }
        get welcomeMsg() { return this._settings.welcomeMsg; }
        set welcomeMsg(val) { this._settings.welcomeMsg = val; }
        get apiUrl() { return this._settings.apiUrl; }
        set apiUrl(val) { this._settings.apiUrl = val; }
        get apiKey() { return this._settings.apiKey; }
        set apiKey(val) { this._settings.apiKey = val; }
    }
    customElements.define("com-custom-sap-claude", ClaudeRuntimeWidget);
})();
