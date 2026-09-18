import assert from 'node:assert/strict';
import { prepareLoopChat, applyLoopChat } from '../../src/shared/chat-protocol/loopChatGuide.ts';
const u=content=>({role:'user',content});
const base={assistant_message:'รับฟังอยู่',safety_state:'normal',mode:'HOLD',capacity:'medium',user_intent:'vent',readiness:'story'};
const fields={trigger:'หัวหน้าขอแก้งาน',emotion_or_body:'อึดอัด',automatic_story:'คิดว่าฉันไม่เก่ง',facts:'เขาให้แก้ตัวเลขสองจุด',needs:'อยากพัก',options:'พักก่อนหรือแยกงานเป็นข้อ'};
const guide={mode:'offered',fields,skipped:[],asked:null,nextOfferAt:2};
for(const text of ['ช่วยพาไปทีละนิดได้ไหม','ได้ แต่อย่าถามยากนะ','ช่วยหน่อย อยากเข้าใจ','เริ่มเย็นลงนิดนึงแล้ว ช่วยพาสำรวจต่อหน่อย']){
  const r=applyLoopChat(prepareLoopChat([u(text)],guide),{},base);
  assert.equal(r.loop_guide.mode,'guided',text);
}
for(const text of ['ไม่อยากให้ช่วยพาสำรวจต่อหน่อย','เขาบอกว่าช่วยพาไปทีละนิดได้ไหม','อย่าพาสำรวจ','ได้ แต่ยังไม่อยากสำรวจ']){
  assert.notEqual(prepareLoopChat([u(text)],guide).state.mode,'guided',text);
}
const explained=applyLoopChat(prepareLoopChat([u('สำรวจคืออะไร')],guide),{},base);
assert.equal(explained.loop_guide.mode,'offered');
assert.equal(prepareLoopChat([u('ได้เลย')],explained.loop_guide).state.mode,'guided');
for(const text of ['ยังไม่พร้อมบอกใครจริง ๆ ขอข้ามข้อนี้ก่อน','ตอนนี้ยังไม่พร้อมทำอะไร ขอข้ามไว้ก่อน']){
  const r=applyLoopChat(prepareLoopChat([u(text)],{...guide,mode:'guided',asked:'micro_action'}),{guideSupport:{needed:true}},base);
  assert.equal(r.loop_guide.asked,'reflection',text);
  assert.ok(r.loop_guide.skipped.includes('micro_action'));
  assert.equal(r.loop_guide.fields.micro_action,undefined);
}
for(const text of ['แค่อยู่เงียบ ๆ ด้วยกันก็พอ','ขอบคุณนะ วันนี้ยังไม่ไหวจริง ๆ ขออยู่แค่นี้ก่อน','ยังถามให้เลือกอีก ขอพอก่อน ไม่อยากตอบซ้ำแล้ว']){
  const r=applyLoopChat(prepareLoopChat([u(text)],guide),{},base);
  assert.equal(r.loop_guide.mode,'listening');
  assert.deepEqual(r.quick_replies,[]);
  assert.doesNotMatch(r.assistant_message,/ไหม|หรือ/);
}
for(const text of ['จะส่งหาแม่ตอนนี้ว่าขอพักยี่สิบนาที แล้วจะไปซื้อให้','เขียนสองจุดที่ต้องแก้ออกมาก่อนน่าจะช่วยได้ จะลองทำแบบนั้นตอนเปิดงาน']){
  const r=applyLoopChat(prepareLoopChat([u(text)],{...guide,mode:'guided',asked:'micro_action'}),{guideSupport:{needed:true}},base);
  assert.equal(r.loop_guide.fields.micro_action,text);
  assert.equal(r.loop_guide.asked,'reflection');
}
for(const text of ['ถ้าจะส่งข้อความก็คงดี แต่ยังไม่พร้อม','อาจจะส่งข้อความ','เขาบอกว่าจะส่งข้อความ']){
  const r=applyLoopChat(prepareLoopChat([u(text)],{...guide,mode:'guided',asked:'micro_action'}),{},base);
  assert.equal(r.loop_guide.fields.micro_action,undefined,text);
}
const reflection='เริ่มรู้ว่าอยากพัก ไม่ใช่เพื่อนทำผิด ยังมีอิจฉาอยู่บ้าง';
const reflected=applyLoopChat(prepareLoopChat([u(reflection)],{...guide,mode:'guided',asked:'reflection',fields:{...fields,micro_action:'จะพักสิบนาที'}}),{guideSupport:{needed:true}},base);
assert.equal(reflected.loop_guide.fields.reflection,reflection);
assert.equal(reflected.loop_guide.mode,'review');
for(const quote of ['มันอัดแน่นในหัวไปหมด','ด่าตัวเอง']){
  const r=applyLoopChat(prepareLoopChat([u(quote)]),{loopTrace:{automatic_story:{quote}}},base);
  assert.equal(r.loop_guide.fields.automatic_story,undefined);
  assert.equal(prepareLoopChat([],{...guide,fields:{automatic_story:quote}}).state.fields.automatic_story,undefined);
}
const optionsGuide={...guide,mode:'guided',asked:'options',fields:{...fields,options:undefined}};
const supported=applyLoopChat(prepareLoopChat([u('ช่วยคิดให้เห็นภาพหน่อย')],optionsGuide),{guideSupport:{needed:true,message:'ลองดูสองทางนี้ ทางไหนที่พอทำไหว?'}},base);
assert.doesNotMatch(supported.assistant_message,/ลองดูสองทางนี้/);
assert.match(supported.assistant_message,/พักการตัดสินใจ.*หรือแยกเรื่อง/);
const question='จากเรื่องที่แม่โทรมา เธออยากลองขอเวลาพักก่อนหรือยังไม่พร้อมเลือกก็ได้?';
const tailored=applyLoopChat(prepareLoopChat([u('อยากสำรวจ')],optionsGuide),{guideQuestion:{field:'options',message:question}},base);
assert.ok(tailored.assistant_message.includes(question));
const mismatch=applyLoopChat(prepareLoopChat([u('อยากสำรวจ')],optionsGuide),{guideQuestion:{field:'needs',message:'คำถามผิดช่องที่ไม่ควรแสดง'}},base);
assert.ok(!mismatch.assistant_message.includes('คำถามผิดช่อง'));
const exercise={id:'emergency_pause',reason:'internal rationale'};
assert.equal(applyLoopChat(prepareLoopChat([u('อึดอัด อยากรู้สึกดีขึ้น')]),{}, {...base,recommended_exercise:exercise}).recommended_exercise,null);
assert.deepEqual(applyLoopChat(prepareLoopChat([u('อยากฝึกหายใจ')]),{}, {...base,recommended_exercise:exercise}).recommended_exercise,exercise);
assert.equal(applyLoopChat(prepareLoopChat([u('ไม่อยากฝึกหายใจ')]),{}, {...base,recommended_exercise:exercise}).recommended_exercise,null);
assert.equal(applyLoopChat(prepareLoopChat([u('ขอพักก่อน')]),{}, {...base,safety_state:'crisis',assistant_message:'crisis response'}).assistant_message,'crisis response');
console.log('PASS: regressions observed in ten browser conversations: consent, skip, rest, concrete answers, field meaning, contextual questions, examples and exercise consent.');
