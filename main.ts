import {
	MarkdownPostProcessorContext,
	Plugin,
	PluginSettingTab,
	Setting,
	App
} from 'obsidian';

import './lib/codemirror';
import './lib/simple';
import "./mode/codemirror-argdown";
import "./mode/codemirror-argdown.css";

import {
	ArgdownApplication,
	IArgdownRequest,
	ParserPlugin,
	ModelPlugin,
	ColorPlugin,
	HighlightSourcePlugin,
	WebComponentExportPlugin,
	MapPlugin,
	ClosedGroupPlugin,
	DotExportPlugin,
	PreselectionPlugin,
	StatementSelectionPlugin,
	ArgumentSelectionPlugin,
	HtmlExportPlugin
} from "./lib/argown-core";
import {SyncDotToSvgExportPlugin } from "@argdown/core/dist/plugins/SyncDotToSvgExportPlugin"; // it needs to be exported explicitly

import {argdownMapScript, webComponentStyle, webcomponentsBundle} from "webComponentScriptAndStyle";


interface MyPluginSettings {
	initialView: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	initialView: 'map'
}

let pluginSettings = {};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		console.log("loading Argdown Plugin");
		setupScripts();

		await this.loadSettings()
		this.addSettingTab(new ArgdownSettingsTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("argdown", this.codeBlockProcessor);
		this.registerMarkdownCodeBlockProcessor("argdown-map", this.codeBlockProcessor);

	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		pluginSettings = this.settings;
	}

	async saveSettings() {
		pluginSettings = this.settings;
		await this.saveData(this.settings);
	}
	onunload() {
		console.log('unloading Argdown plugin');
	}

	/**
	 * updates the preview pane, replaces the codeblock preview with the argument map
	 */
	codeBlockProcessor(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		el.innerHTML = `${argdownInputToComponent(source)}`;
	}
}

/**
 *  Takes in argdown syntax and returns a web component with the map
 * @param input: argdown text (without the ```argdown``` or ```argdown-map```)
 */
function argdownInputToComponent(input: string) {
	const app = new ArgdownApplication();

	const parserPlugin = new ParserPlugin();
	app.addPlugin(parserPlugin, "parse-input");

	const modelPlugin = new ModelPlugin();
	app.addPlugin(modelPlugin, "build-model");

	const preSelectionPlugin = new PreselectionPlugin();
	app.addPlugin(preSelectionPlugin, "pre");

	const statementSelection = new StatementSelectionPlugin();
	app.addPlugin(statementSelection, "statement");

	const argumentSelectionPlugin = new ArgumentSelectionPlugin();
	app.addPlugin(argumentSelectionPlugin, "argument");

	const mapPlugin = new MapPlugin();
	app.addPlugin(mapPlugin, "build-map");

	const closedGroupPlugin = new ClosedGroupPlugin();
	app.addPlugin(closedGroupPlugin, "transform-closed-groups");

	const colorPlugin = new ColorPlugin();
	app.addPlugin(colorPlugin, "colorize");

	const dotExportPlugin = new DotExportPlugin();
	app.addPlugin(dotExportPlugin, "export-dot");

	const dotToSvgPlugin = new SyncDotToSvgExportPlugin();
	app.addPlugin(dotToSvgPlugin, "export-svg")

	const highlightSourcePlugin = new HighlightSourcePlugin();
	app.addPlugin(highlightSourcePlugin, "highlight-source");

	const webComponentExportPlugin = new WebComponentExportPlugin({initialView: pluginSettings.initialView});
	app.addPlugin(webComponentExportPlugin, "export-web-component");

	const request:IArgdownRequest = {
		input,
		process: [
			"parse-input",
			"build-model",
			"pre",
			"statement",
			"argument",
			"build-map",
			"transform-closed-groups",
			"colorize",
			"export-dot",
			"export-svg",
			"highlight-source",
			"export-web-component"
		],
		// logLevel: "verbose"
	}
	return app.run(request).webComponent;
}

class ArgdownSettingsTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Argdown Plugin Settings'});

		const firstOption = pluginSettings.initialView;
		const secondOption = pluginSettings.initialView === "map" ? "source" : "map";

		new Setting(containerEl)
			.setName('Initial View')
			.setDesc('What should display by default when you edit your Argdown')
			.addDropdown(dropdown => dropdown
				.addOption(firstOption, firstOption)
					.onChange(async (value) => {
					this.plugin.settings.initialView = value;
					await this.plugin.saveSettings();
				})
				.addOption(secondOption, secondOption)
					.onChange(async (value) => {
						this.plugin.settings.initialView = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

/**
 * grabs all the scripts that are saved offline so that all the styles and functionality is still there even when there is no internet
 */
const setupScripts = () => {
	//"https://cdn.jsdelivr.net/npm/@argdown/web-components/dist/argdown-map.css";
	const stylesheet = document.createElement("style");//document.createElement("link");
	stylesheet.innerHTML = webComponentStyle;


	const webComponentScript = document.createElement("script");
	webComponentScript.src = "data:text/javascript;charset=utf-8," + webcomponentsBundle;
	// webComponentScript.src = "https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs/webcomponents-bundle.js";
	webComponentScript.type = "module";

	const mapScript = document.createElement("script");
	mapScript.src = "data:text/javascript;charset=utf-8," + argdownMapScript;
	// mapScript.src = "https://cdn.jsdelivr.net/npm/@argdown/web-components/dist/argdown-map.js";
	mapScript.type = "text/javascript";

	document.getElementsByTagName("head")[0].appendChild(stylesheet);
	document.getElementsByTagName("head")[0].appendChild(webComponentScript);
	document.getElementsByTagName("head")[0].appendChild(mapScript);
}

