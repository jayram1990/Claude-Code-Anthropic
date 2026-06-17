(function() {
    let template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host { display: block; padding: 1em; font-family: Arial, sans-serif; color: #333; }
            .section { margin-bottom: 16px; }
            label { display: block; font-size: 12px; font-weight: bold; margin-bottom: 6px; color: #475569; }
            input, select { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
            input:focus, select:focus { border-color: #2563eb; outline: none; }
            .hint { font-size: 11px; color: #64748b; margin-top: 4px; font-style: italic; }
        </style>
        <div class="section">
            <label>Header Component Label</label>
            <input type="text" id="aps_headerLabel" />
        </div>
        <div class="section">
            <label>AI Model Mapping (Hyperspace Tag)</label>
            <select id="aps_model">
                <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                <option value="claude-opus-4-8">Claude Opus 4.8</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            </select>
        </div>
        <div class="section">
            <label>Proxy API URL</label>
            <input type="text" id="aps_apiUrl" placeholder="https://your-backend/api/chat" />
        </div>
        <div class="section">
            <label>API Key</label>
            <input type="password" id="aps_apiKey" placeholder="Your backend API key" />
        </div>
        <div class="section">
            <label>Initial Greeting Welcome Splash</label>
            <input type="text" id="aps_welcomeMsg" />
        </div>
        <div class="section">
            <label>Creativity Configuration (Temperature)</label>
            <input type="number" id="aps_temperature" min="0" max="1" step="0.1" />
            <div class="hint">0.0 = Precise/Deterministic. 1.0 = Highly Creative.</div>
        </div>
        <div class="section">
            <label>Token Bounds Maximum</label>
            <input type="number" id="aps_maxTokens" min="10" max="4000" />
        </div>
    `;

    class ClaudePropertyBuilderPanel extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            
            // Map configuration targets 
            this._props = {};
            
            this.bindEvent("aps_headerLabel", "headerLabel");
            this.bindEvent("aps_model", "model");
            this.bindEvent("aps_welcomeMsg", "welcomeMsg");
            this.bindEvent("aps_temperature", "temperature", true);
            this.bindEvent("aps_maxTokens", "maxTokens", true);
            this.bindEvent("aps_apiUrl", "apiUrl");
            this.bindEvent("aps_apiKey", "apiKey");
        }

        bindEvent(domId, propName, isNumeric = false) {
            const element = this._shadowRoot.getElementById(domId);
            element.addEventListener("change", () => {
                let val = element.value;
                if (isNumeric) val = parseFloat(val);
                
                this._props[propName] = val;
                
                // Dispatch event synchronization directly up to the active SAC properties stream
                this.dispatchEvent(new CustomEvent("propertiesChanged", {
                    detail: { properties: { [propName]: val } }
                }));
            });
        }

        // Fired automatically by SAC panel when user clicks the widget element instance
        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            if (this._props.headerLabel) this._shadowRoot.getElementById("aps_headerLabel").value = this._props.headerLabel;
            if (this._props.model) this._shadowRoot.getElementById("aps_model").value = this._props.model;
            if (this._props.welcomeMsg) this._shadowRoot.getElementById("aps_welcomeMsg").value = this._props.welcomeMsg;
            if (this._props.temperature !== undefined) this._shadowRoot.getElementById("aps_temperature").value = this._props.temperature;
            if (this._props.maxTokens !== undefined) this._shadowRoot.getElementById("aps_maxTokens").value = this._props.maxTokens;
            if (this._props.apiUrl) this._shadowRoot.getElementById("aps_apiUrl").value = this._props.apiUrl;
            if (this._props.apiKey) this._shadowRoot.getElementById("aps_apiKey").value = this._props.apiKey;
        }
    }

    customElements.define("com-custom-sap-claude-aps", ClaudePropertyBuilderPanel);
})();
