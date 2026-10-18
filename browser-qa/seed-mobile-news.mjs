// Local D1 only; emitted SQL contains synthetic public archive rows and no credentials.
const date=new Date().toISOString();
console.log("INSERT INTO works(id,title,original_title,type,status,poster_url) VALUES ('qa-work','합성 작품','Synthetic Work','series','recent','');");
for(let index=0;index<12;index++){
  const id=`qa-article-${index}`;
  const topic=`qa-story-${index}`;
  const category=index%2?'시리즈':'영화';
  const title=index===0?'아소카의 새로운 소식과 길게 이어지는 합성 뉴스 제목':'합성 소식 '+index;
  console.log(`INSERT INTO articles(id,topic,title,summary,image,url,source,published,category,status) VALUES ('${id}','${topic}','${title}','공개 아카이브 화면 검증을 위한 합성 요약입니다.','','https://example.com/synthetic/${index}','starwars','${date}','${category}','published');`);
}
console.log("INSERT INTO article_work_relations(article_id,work_id,state,origin) VALUES ('qa-article-0','qa-work','linked','manual');");

// Synthetic aggregate for Admin warning/limit display, not real provider usage.
console.log("INSERT INTO assistant_monthly_costs VALUES(strftime('%Y-%m','now','+9 hours'),21000000,0,0,1000,0);");
