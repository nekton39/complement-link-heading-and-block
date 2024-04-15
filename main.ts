import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { AutoCompleteSuggest } from "AutoCompleteSuggest";
// Remember to rename these classes and interfaces!

export default class ComplementLinkHeadingAndBlock extends Plugin {
	suggester: AutoCompleteSuggest;
	async onload() {
		console.log("load Complement Link Heading And Block");

		this.suggester = AutoCompleteSuggest.createInstance(this.app);
		this.registerEditorSuggest(this.suggester);
	}

}