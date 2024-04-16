import {
    App,
    Editor,
    EditorSuggest,
    EditorSuggestContext,
    EditorPosition,
    EditorSuggestTriggerInfo, // Add this line if it's available in the "obsidian" package
    HeadingCache,
    SectionCache,
    TFile
} from "obsidian";


interface ExtendedHeadingCache extends HeadingCache {
  matchText?: string;
  title?: string;
  path?: string;
}
interface ExtendedSectionCache extends SectionCache {
  matchText?: string;
  title?: string;
  path?: string;
  isNewID?: boolean;
}

export class AutoCompleteSuggest extends EditorSuggest<any>
{
  app: App;
  mode: String;
  private constructor(app: App) {
    super(app);
    this.app = app;
  }
  // Public static method to create an instance
  public static createInstance(app: App): AutoCompleteSuggest {
    return new AutoCompleteSuggest(app);
  }

  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
    // console.log(`cursor: ${JSON.stringify(cursor)}`);
    // console.log(`line: ${editor.getLine(cursor.line)}`);
    // console.log(`slice: ${editor.getLine(cursor.line).slice(0, cursor.ch)}`);

    let activeFile = this.app.workspace.getActiveFile();
    if(activeFile === null) return null;

    // console.log(`activeFile: `);
    // console.log(activeFile);

    // check markdown link
    let sliceText = editor.getLine(cursor.line).slice(0, cursor.ch);
    let matchHeadingBlock = sliceText.match(/\[([^\]]*)\]\((\<?)([^\)\>#\^]+)(\>?)\)(#|\^)$/);

    if(matchHeadingBlock === null) return null;

    // choice mode
    let matchText = matchHeadingBlock[0];
    let title = matchHeadingBlock[1];
    let path = matchHeadingBlock[3];
    this.mode = matchHeadingBlock[5] == `#` ? "heading" : "block";

    // get heading
    let firstLinkTFile = this.app.metadataCache.getFirstLinkpathDest(path, activeFile.path);
    if(firstLinkTFile === null) return null;

    let metadata = this.app.metadataCache.getFileCache(firstLinkTFile);
    if(metadata === null) return null;
    // console.log(`metadata: `);
    // console.log(metadata);

    // make suggestion item object
    let suggestions;
    if(this.mode == "heading"){
      suggestions = metadata.headings?.map((heading) => {
        let extendedHeading: ExtendedHeadingCache = {...heading, matchText: matchText, title: title, path: path};
        return extendedHeading;
      });
    }
    else if(this.mode == "block"){
      suggestions = metadata.sections?.map((section) => {
        let isNewID = section.id === undefined;
        let id = (isNewID ? generateId() : section.id);
        let extendedSection: ExtendedSectionCache = {...section, matchText: matchText, title: title, path: path, id: id, isNewID: isNewID};
        return extendedSection;
      });
    }
    else{
      return null;
    }

    // console.log(`suggestions: `);
    // console.log(suggestions);

    // this value send to getSuggestions() as context
    return {
      start: {
        line: cursor.line,
        ch: cursor.ch - matchText.length
      },
      end: cursor,
      query: JSON.stringify(suggestions)
    };

    // for generating block id
    function generateId(){
      return Math.random().toString(36).substring(2, 8);
    }
  }

  getSuggestions(context: EditorSuggestContext): Promise<any> {
    return new Promise((resolve) => {
        resolve(JSON.parse(context.query));
    });
  }

  renderSuggestion(suggestion: any, el: HTMLElement) {
    // console.log(suggestion)
    // console.log(el);

    // heading
    if(this.mode === "heading"){
      // make HTML elements and set style seettings
      processHeading(suggestion.heading, el);
      return;
    }
    // for block (it means even section)
    if(this.mode === "block"){

      // get TFiles, activeFile and targetFile
      const activeFile = this.app.workspace.getActiveFile();
      if(activeFile === null) return;
      const targetTFile = this.app.metadataCache.getFirstLinkpathDest(suggestion.path, activeFile.path);
      if(targetTFile === null) return;

      this.app.vault.read(targetTFile).then((content)=>{
        let arrayText = content.split('\n');

        // paragraph type is block
        if(suggestion.type === "paragraph"){

          // get block text
          let text = "";
          for(let line_i=suggestion.position.start.line; line_i <= suggestion.position.end.line; line_i++){
            text += arrayText[line_i] + '\n';
          }
          text = text.trim();  
          // console.log(text);
  
          // make HTML elements and set style seettings
          const base = createDiv();
          base.addClass("complement-link-heading-and-block-suggestion-base");
          base.style.display = `flex`;

          const blockDiv = base.createDiv({ text: `${text}` });
          blockDiv.addClass("complement-link-heading-and-block-suggestion-block");
          blockDiv.style.display = 'flex';
          blockDiv.style.alignItems = `center`;
          blockDiv.style.margin = `8px`;
      
          const idDiv = base.createDiv({ text: `>${suggestion.id}`});
          idDiv.addClass("complement-link-heading-and-block-suggestion-id");
          idDiv.style.display = 'flex';
          idDiv.style.alignItems = `center`;
          idDiv.style.color = `#8a8a8a`;
      
          el.addClass("complement-link-heading-and-block-suggestion-item");
          el.style.display = `flex`;
          el.style.justifyContent = `space-between`;
          el.style.marginLeft = `auto`;
          el.style.alignItems = `center`;
          el.style.padding = `8px 0`;
      
          el.appendChild(base);
          return;
        }
        // for heading
        if(suggestion.type === "heading"){
          // get heading text
          let text = arrayText[suggestion.position.start.line];
          text = text.trim();
          
          // get heading level
          let match = text.match(/^#+/);
          if(match === null) return;
          let level = match[0].length;
          // console.log(text);
          // console.log(level);

          // make HTML elements and set style seettings
          const base = createDiv();
          base.addClass("complement-link-heading-and-block-suggestion-base");
          base.style.display = `flex`;
      
          const headingDiv = base.createDiv({ text: text });
          headingDiv.addClass("complement-link-heading-and-block-suggestion-heading");
          headingDiv.style.display = 'flex';
          headingDiv.style.alignItems = `center`;
          headingDiv.style.margin = `8px`;
      
          const levelDiv = base.createDiv({ text: `H${level}` });
          levelDiv.addClass("complement-link-heading-and-block-suggestion-level");
          levelDiv.style.display = 'flex';
          levelDiv.style.alignItems = `center`;
          levelDiv.style.color = `#8a8a8a`;
      
          el.addClass("complement-link-heading-and-block-suggestion-item");
          el.style.display = `flex`;
          el.style.justifyContent = `space-between`;
          el.style.marginLeft = `auto`;
          el.style.alignItems = `center`;
          el.style.padding = `8px 0`;
          el.appendChild(base);      
        }
      });
    }

    function processHeading(heading: string, el: HTMLElement){
      const base = createDiv();  
      base.style.display = `flex`;
  
      const headingDiv = base.createDiv({ text: heading });
      headingDiv.style.display = 'flex';
      headingDiv.style.alignItems = `center`;
      headingDiv.style.margin = `8px`;
  
      const levelDiv = base.createDiv({ text: `H${suggestion.level}` });
      levelDiv.style.display = 'flex';
      levelDiv.style.alignItems = `center`;
      levelDiv.style.color = `#8a8a8a`;
  
      el.addClass("complement-link-heading-and-block-suggestion-item");
      el.style.display = `flex`;
      el.style.justifyContent = `space-between`;
      el.style.marginLeft = `auto`;
      el.style.alignItems = `center`;
      el.style.padding = `8px 0`;
  
      el.appendChild(base);  
    }
  }

  selectSuggestion(suggestion: any, evt: MouseEvent | KeyboardEvent): void {
    let insertText: string;

    // for heading
    if(this.mode === "heading" ){
      // make insert text
      insertText = `[${suggestion.title}](<${suggestion.path}#${suggestion.heading}>)`;  
      
      // insert text to active File
      this.context?.editor.replaceRange(
        insertText,
        this.context.start,
        this.context.end
      );  
    }

    // for block (it means even section)
    if(this.mode === "block"){
      // get TFiles, activeFile and targetFile
      const activeFile = this.app.workspace.getActiveFile();
      if(activeFile === null) return;
      const targetTFile = this.app.metadataCache.getFirstLinkpathDest(suggestion.path, activeFile.path);
      if(targetTFile === null) return;

      // read text from targetFile
      this.app.vault.read(targetTFile).then((content)=>{
        let textArray = content.split('\n');
        
        // for heading
        if(suggestion.type === "heading"){
          // make insert text
          let match = textArray[suggestion.position.start.line].match(/^#+ (.*)$/);
          if(match === null) return;
          let heading = match[1];
          insertText = `[${suggestion.title}](<${suggestion.path}#${heading}>)`;
        }

        // for block (it means even section)
        if(suggestion.type === "paragraph"){
          // make insert text
          insertText = `[${suggestion.title}](<${suggestion.path}#^${suggestion.id}>)`;
          
          // write block id to targetFile when it doesn't have block id
          if(suggestion.isNewID){
            let a = content.slice(0, suggestion.position.end.offset);
            let b = ` ^${suggestion.id}`;
            let c = content.slice(suggestion.position.end.offset);
            let newFileContent = a + b + c;
            this.app.vault.modify(targetTFile, newFileContent);  
          }
        }

        // insert text to active File
        this.context?.editor.replaceRange(
          insertText,
          this.context.start,
          this.context.end
        );
      });
    }
    // console.log(`insertText: ${insertText}`);
    // console.log(this.context);
  }
  
  // Implement other required methods and properties...
}