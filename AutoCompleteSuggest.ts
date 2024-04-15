import {
    App,
    Editor,
    EditorSuggest,
    EditorSuggestContext,
    EditorPosition,
    EditorSuggestTriggerInfo, // Add this line if it's available in the "obsidian" package
    HeadingCache,
    TFile
} from "obsidian";


interface ExtendedHeadingCache extends HeadingCache {
  matchText?: string;
  title?: string;
  path?: string;
}

export class AutoCompleteSuggest extends EditorSuggest<any>
{
  app: App;
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

    let sliceText = editor.getLine(cursor.line).slice(0, cursor.ch);    // markdown link
    let match = sliceText.match(/\[([^\]]*)\]\((\<?)([^\)\>#\^]+)(\>?)\)#$/);
    if(match === null) return null;
    
    let matchText = match[0];
    let title = match[1];
    let path = match[3];

    // get heading
    let firstLinkTFile = this.app.metadataCache.getFirstLinkpathDest(path, activeFile.path);
    if(firstLinkTFile === null) return null;

    let metadata = this.app.metadataCache.getFileCache(firstLinkTFile);
    if(metadata === null) return null;
    // console.log(`metadata: `);
    // console.log(metadata);

    let suggestions = metadata.headings?.map((heading) => {
      let extendedHeading: ExtendedHeadingCache = {...heading, matchText: matchText, title: title, path: path};
      return extendedHeading;
    });

    // console.log(`suggestions: `);
    // console.log(suggestions);

    return {
      start: {
        line: cursor.line,
        ch: cursor.ch - matchText.length
      },
      end: cursor,
      query: JSON.stringify(suggestions)
    };
  }

  getSuggestions(context: EditorSuggestContext): Promise<any> {
    return new Promise((resolve) => {
        resolve(JSON.parse(context.query));
    });
  }

  renderSuggestion(suggestion: any, el: HTMLElement): void {
    // Implementation
    // console.log(suggestion)
    // console.log(el);

    const base = createDiv();
    const heading = suggestion.heading;

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

    // setTimeout(()=>{
    //   debugger;
    // }, 1000);
  }

  selectSuggestion(suggestion: any, evt: MouseEvent | KeyboardEvent): void {
    // Implementation

    let insertText = `[${suggestion.title}](<${suggestion.path}#${suggestion.heading}>)`;

    // console.log(`insertText: ${insertText}`);
    // console.log(this.context);

    this.context?.editor.replaceRange(
      insertText,
      this.context.start,
      this.context.end
    );

  }
  
  // Implement other required methods and properties...
}