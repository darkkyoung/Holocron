export type WorkChoice={id:string;title:string;originalTitle:string;seasonNumber?:string|null};
export type ArticleWorkRelation={articleId:string;workId:string;state:'linked'|'excluded';origin:'automatic'|'manual'};
export type WorkNewsOption={id:string;title:string;count:number};
export type RelatedStory={topic:string;title:string;published:string;source:string;sourceCount:number;url:string};
export type WorkNews={count:number;stories:RelatedStory[]};
export type AssociationReport={inspected:number;added:number;ambiguous:number;unmatched:number;manualPreserved:number;nextCursor:string|null};
