import type {Article} from '../../news';
import type {HistoricalRange} from '../date-range';

export type Candidate={url:string;title:string;description:string;published:string;image:string;headlineOnly?:boolean;discoveryDate?:string};
export type SourceId='starwars'|'swnn'|'collider'|'thr'|'deadline'|'variety'|'forbes';
export type FetchText=(url:string)=>Promise<string>;
export type SourceParseResult={candidates:Candidate[];paths:string[]};
export type ArchiveEndpoint={url:string;parse:(body:string)=>Candidate[];path:string};
export type ArchivePlan={endpoints:ArchiveEndpoint[];preflightRequests?:number;failures?:string[];paths?:string[]};
export type SourceDiscoveryContext={now:number;mode:'normal'|'historical';range?:HistoricalRange;articles:readonly Pick<Article,'source'|'url'>[]};
export type SourceCoverage={coverage:'complete'|'limited';coverageNote:string};
export type CandidateEnricher=(candidate:Candidate)=>Promise<Candidate>;
export type CandidateEnrichmentDiagnostic={kind:'image-lookup-failure';message:string};
export type CandidateEnricherContext={reportDiagnostic?:(diagnostic:CandidateEnrichmentDiagnostic)=>void};

export type SourceAdapter={
  id:SourceId;name:string;description:string;category:string;url:string;endpoint:string;trusted:boolean;hosts:readonly string[];
  parsePrimary:(body:string)=>SourceParseResult;
  archivePlan?:(context:SourceDiscoveryContext,fetchText:FetchText)=>ArchivePlan|Promise<ArchivePlan>;
  createCandidateEnricher?:(fetchText:FetchText,context?:CandidateEnricherContext)=>CandidateEnricher;
  enrichFromHtml?:(candidate:Candidate,html:string)=>Candidate;
  coverage?:(mode:'normal'|'historical')=>SourceCoverage;
};
