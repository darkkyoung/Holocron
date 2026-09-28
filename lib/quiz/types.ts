export const QUIZ_STATUS_VALUES=['draft','scheduled','published'] as const;
export const QUIZ_MIN_OPTIONS=2;
export const QUIZ_MAX_OPTIONS=5;
export const DEFAULT_QUIZ_IMAGE_CROP={x:50,y:50,zoom:100} as const;

export type QuizStatus=typeof QUIZ_STATUS_VALUES[number];
export type QuizImageCrop={x:number;y:number;zoom:number};

export type QuizOption={
  id:string;
  label:string;
  imageUrl:string|null;
  imageCrop:QuizImageCrop;
  position:number;
};

export type QuizAdminOption=QuizOption&{isCorrect:boolean};

export type QuizSummary={
  id:string;
  question:string;
  heroImageUrl:string|null;
  heroImageCrop:QuizImageCrop;
  heroLinkUrl:string|null;
  status:QuizStatus;
  publishAt:string|null;
  createdAt:string;
  updatedAt:string;
};

export type PublicQuiz=QuizSummary&{options:QuizOption[]};

export type AdminQuiz=QuizSummary&{
  explanation:string;
  options:QuizAdminOption[];
};

export type QuizResult={
  selectedOptionId:string;
  totalVotes:number;
  explanation:string;
  options:Array<{
    id:string;
    votes:number;
    percent:number;
    isCorrect:boolean;
  }>;
};

export type QuizDraft={
  /** Compatibility value for the existing non-null database column. */
  title:string;
  question:string;
  heroImageUrl:string|null;
  heroImageCrop:QuizImageCrop;
  heroLinkUrl:string|null;
  explanation:string;
  status:QuizStatus;
  publishAt:string|null;
  options:Array<{
    label:string;
    imageUrl:string|null;
    imageCrop:QuizImageCrop;
    isCorrect:boolean;
  }>;
};

export function quizCompatibilityTitle(question:string){
  return question.slice(0,140);
}

export function isQuizStatus(value:unknown):value is QuizStatus{
  return typeof value==='string'&&(QUIZ_STATUS_VALUES as readonly string[]).includes(value);
}

export function isQuizPublic(status:QuizStatus,publishAt:string|null,now:Date){
  if(status==='draft')return false;
  if(status==='published')return !publishAt||Date.parse(publishAt)<=now.getTime();
  return !!publishAt&&Date.parse(publishAt)<=now.getTime();
}

export function effectiveQuizStatus(status:QuizStatus,publishAt:string|null,now:Date){
  if(status==='draft')return 'draft' as const;
  if(publishAt&&Date.parse(publishAt)>now.getTime())return 'scheduled' as const;
  return 'published' as const;
}
