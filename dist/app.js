const factors = {
  electricity: { label: '外购电力', note: '范围 2', unit: 'kWh', value: 680000, factor: 0.5366, factorLabel: '0.5366 kg/kWh', color: '#285f50' },
  material: { label: '金属原材料', note: '主要范围 3', unit: 't', value: 280, factor: 1850, factorLabel: '1,850 kg/t', color: '#547d70' },
  gas: { label: '天然气', note: '范围 1', unit: 'm³', value: 45000, factor: 2.162, factorLabel: '2.162 kg/m³', color: '#7c9a90' },
  diesel: { label: '柴油', note: '范围 1', unit: 'L', value: 6000, factor: 2.68, factorLabel: '2.680 kg/L', color: '#a2b3ad' },
  transport: { label: '上游运输', note: '主要范围 3', unit: 't·km', value: 120000, factor: 0.095, factorLabel: '0.095 kg/t·km', color: '#c3ccc8' }
};

const actions = [
  { id:'green', title:'采购 30% 绿电', description:'以年度电力消费为边界，先核验合同、电量与环境权益归属。', source:'electricity', rate:.30, cost:23, payback:'政策驱动', score:91, tags:['范围 2','可追溯凭证'] },
  { id:'motor', title:'电机与空压系统优化', description:'通过分表与负载测试识别空载、泄漏和低效运行时段。', source:'electricity', rate:.12, cost:18, payback:'1.7 年', score:88, tags:['设备改造','可实测'] },
  { id:'material', title:'低碳材料替代 10%', description:'对强度、良率和供应稳定性设约束，优先比较同类再生材料。', source:'material', rate:.15, cost:35, payback:'需报价', score:82, tags:['范围 3','供应链协同'] },
  { id:'gas', title:'热处理待机时长优化', description:'用工单和燃气曲线匹配开停机节奏，减少非生产时段燃烧。', source:'gas', rate:.08, cost:3, payback:'0.6 年', score:79, tags:['流程优化','低门槛'] },
  { id:'route', title:'供应商运输路径整合', description:'合并零担批次，减少空驶与非必要中转，并记录货运周转量。', source:'transport', rate:.18, cost:2, payback:'0.8 年', score:73, tags:['物流','协同执行'] }
];

let selected = new Set(['green','motor','gas']);
let scope3 = true;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = (n, digits=0) => Number(n).toLocaleString('zh-CN',{maximumFractionDigits:digits,minimumFractionDigits:digits});
const emission = key => factors[key].value * factors[key].factor / 1000;
const total = () => Object.keys(factors).reduce((sum,key)=>sum + ((!scope3 && ['material','transport'].includes(key)) ? 0 : emission(key)),0);
const actionReduction = action => (!scope3 && ['material','transport'].includes(action.source)) ? 0 : emission(action.source)*action.rate;

function renderInventory(){
  const rows = Object.entries(factors).map(([key,item])=>`
    <div class="activity-row">
      <div class="source-name"><i style="background:${item.color}"></i><div><strong>${item.label}</strong><small>${item.note}</small></div></div>
      <input type="number" min="0" step="1" value="${item.value}" data-source="${key}" aria-label="${item.label}活动数据">
      <span class="factor">${item.factorLabel}<br>演示因子</span>
      <strong>${fmt(emission(key),1)} t</strong>
    </div>`).join('');
  $('#activityRows').innerHTML = `<div class="activity-row header"><span>排放源</span><span>活动数据</span><span class="factor">排放因子</span><span style="text-align:right">估算排放</span></div>${rows}`;
  $$('#activityRows input').forEach(input=>input.addEventListener('input',e=>{factors[e.target.dataset.source].value=Math.max(0,Number(e.target.value)||0);renderInventory();updateAll();}));
}

function renderActions(){
  $('#actionGrid').innerHTML = actions.map((a,i)=>{
    const reduction=actionReduction(a);
    return `<article class="card action-card ${selected.has(a.id)?'selected':''}">
      <span class="rank">0${i+1}</span><input class="select-action" type="checkbox" data-action="${a.id}" ${selected.has(a.id)?'checked':''} aria-label="选择${a.title}">
      <h3>${a.title}</h3><p>${a.description}</p>
      <div class="action-stats"><div><span>预计减排</span><b>${fmt(reduction,1)} t/年</b></div><div><span>首年投入</span><b>${a.cost} 万元</b></div><div><span>回收期</span><b>${a.payback}</b></div></div>
      <div class="tag-row">${a.tags.map(t=>`<span class="tag">${t}</span>`).join('')}<span class="tag">AI评分 ${a.score}</span></div>
    </article>`
  }).join('');
  $$('.select-action').forEach(box=>box.addEventListener('change',e=>{e.target.checked?selected.add(e.target.dataset.action):selected.delete(e.target.dataset.action);renderActions();updateAll();}));
}

function updateAll(){
  const values = Object.keys(factors).filter(k=>scope3 || !['material','transport'].includes(k)).map(k=>({key:k,label:factors[k].label,value:emission(k),color:factors[k].color})).sort((a,b)=>b.value-a.value);
  const sum=total();
  const output=Math.max(1,Number($('#output').value)||120000);
  const chosen=actions.filter(a=>selected.has(a.id));
  const reduction=chosen.reduce((s,a)=>s+actionReduction(a),0);
  const cost=chosen.reduce((s,a)=>s+a.cost,0);
  $('#totalEmission').textContent=fmt(sum,0); $('#donutTotal').textContent=fmt(sum,0);
  $('#intensity').textContent=fmt(sum*1000/output,2);
  $('#selectedReduction').textContent=fmt(reduction,0); $('#toolbarReduction').textContent=fmt(reduction,0);
  $('#reductionPercent').textContent=`约占基线 ${fmt(sum?reduction/sum*100:0,1)}%`;
  $('#selectedCost').textContent=`¥ ${fmt(cost,0)}`; $('#toolbarCost').textContent=fmt(cost,0); $('#actionCount').textContent=chosen.length;
  $('#roadmapTarget').textContent=`验证 ${fmt(reduction,0)} tCO₂e/年减排潜力`;
  const segments=[]; let cursor=0; values.forEach(v=>{const pct=sum?v.value/sum*100:0;segments.push(`${v.color} ${cursor}% ${cursor+pct}%`);cursor+=pct});
  $('#donut').style.background=`conic-gradient(${segments.join(',')})`;
  $('#legend').innerHTML=values.map(v=>`<div class="legend-row"><i style="background:${v.color}"></i><span>${v.label}</span><b>${fmt(v.value,1)} t · ${fmt(sum?v.value/sum*100:0,0)}%</b></div>`).join('');
  const ranked=[...actions].sort((a,b)=>actionReduction(b)-actionReduction(a)).slice(0,3);
  $('#topActions').innerHTML=ranked.map((a,i)=>`<li><span>${i+1}</span><div><strong>${a.title}</strong><small>预计投入 ${a.cost} 万元 · ${a.payback}</small></div><b>−${fmt(actionReduction(a),1)}t</b></li>`).join('');
  $('#pilotActionText').textContent=chosen.length?`优先验证“${chosen[0].title}”，获取真实报价与实施条件；同步执行一项低门槛措施。`:'从建议列表中选择至少一项措施，获取真实报价与实施条件。';
}

function switchView(id){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===id));
  $('#pageTitle').textContent=$(`#${id}`).dataset.title;
  window.scrollTo({top:0,behavior:'smooth'});
}

function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}

async function copyDraft(targetId){
  const text=$(`#${targetId}`).textContent.trim();
  try{await navigator.clipboard.writeText(text);toast('已复制，可直接粘贴到报名表')}
  catch(e){const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();toast('已复制，可直接粘贴到报名表')}
}

function saveState(){
  const state={factors:Object.fromEntries(Object.entries(factors).map(([k,v])=>[k,v.value])),selected:[...selected],scope3,output:$('#output').value,company:$('#companyName').value,district:$('#district').value,industry:$('#industry').value};
  localStorage.setItem('localCarbonCopilot',JSON.stringify(state));toast('本次测算已保存在当前浏览器');
}

function exportSummary(){
  const chosen=actions.filter(a=>selected.has(a.id));const sum=total();const reduction=chosen.reduce((s,a)=>s+actionReduction(a),0);const cost=chosen.reduce((s,a)=>s+a.cost,0);
  const body=`地方碳策 AI｜AI4Climate 参赛项目摘要\n\n【一个地方】中国浙江省宁波市${$('#district').value}\n【一个气候问题】制造业中小企业的能源、物料与采购凭证分散，难以低成本形成可信碳排放基线并判断优先减排措施。\n【一个 AI 解法】用 AI 完成凭证抽取、因子匹配、异常识别和多约束措施排序；确定性公式引擎负责排放计算，专业人员负责最终复核。\n\n目标用户：制造企业能源/ESG负责人、第三方碳核算顾问\n试点企业：${$('#companyName').value}\n行业：${$('#industry').value}\n\n年度排放基线：${fmt(sum,1)} tCO₂e\n单位产品碳强度：${fmt(sum*1000/Math.max(1,Number($('#output').value)),2)} kgCO₂e/件\n\n已选措施：\n${chosen.map((a,i)=>`${i+1}. ${a.title}｜预计减排 ${fmt(actionReduction(a),1)} tCO₂e/年｜首年投入 ${a.cost} 万元`).join('\n')||'尚未选择'}\n\n组合预计减排：${fmt(reduction,1)} tCO₂e/年\n组合首年投入：${fmt(cost,0)} 万元\n\n90天验证指标：关键数据覆盖率≥95%；与专家复核结果偏差≤10%；资料整理时间减少≥60%；至少1项措施被企业实际采纳。\n\n安全边界：本摘要使用演示排放因子和成本参数，不构成正式认证、政策申报或投资建议；AI不得直接生成排放数值，正式结果须依据最新标准人工复核。`;
  const blob=new Blob([body],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='地方碳策AI-AI4Climate项目摘要.txt';a.click();URL.revokeObjectURL(url);toast('参赛项目摘要已导出');
}

function exportDemoScript(){
  const body=`地方碳策 AI｜3分钟演示视频提纲\n\n00:00–00:20｜真实问题\n地点是宁波市北仑区。制造业中小企业拥有电费、物料和采购数据，却很难把分散凭证变成可信碳排放基线，更不知道哪项减排投资应当先做。\n\n00:20–00:40｜目标用户\n直接用户是企业能源或ESG负责人和第三方核算顾问。企业、工业园区或绿色供应链服务机构是潜在付费方。\n\n00:40–01:20｜为什么需要 AI\n展示四步流程：AI读取账单和BOM；按地区、年份和材料语义匹配排放因子；识别缺失与重复边界；在减排量、成本、产能和政策约束下排序措施。强调排放量由可审计公式计算，不由大模型猜测。\n\n01:20–02:10｜现场操作 Demo\n修改年度用电量，展示排放基线与热点实时变化；选择绿电、电机优化或材料替代，展示减排量、投入和优先级联动；打开数据检查，展示补证清单。\n\n02:10–02:40｜90天验证\n与1–3家宁波制造企业合作，验证数据覆盖率≥95%、与专家复核偏差≤10%、资料整理时间减少≥60%，并推动至少1项措施获得报价、工单或批准记录。\n\n02:40–03:00｜影响与边界\n这不是自动写报告，也不替代认证。它让中小企业用更低成本持续管理碳数据，把政策要求转化成可执行、可验证的减排行动。`;
  const blob=new Blob([body],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='地方碳策AI-3分钟演示提纲.txt';a.click();URL.revokeObjectURL(url);toast('3分钟演示提纲已导出');
}

$$('.nav-item,.go-view').forEach(el=>el.addEventListener('click',()=>switchView(el.dataset.view)));
$('#dismissBanner').addEventListener('click',()=>$('.demo-banner').remove());
$('#saveBtn').addEventListener('click',saveState);$('#exportBtn').addEventListener('click',exportSummary);
$('#demoScriptBtn').addEventListener('click',exportDemoScript);
$$('.copy-field').forEach(button=>button.addEventListener('click',()=>copyDraft(button.dataset.copyTarget)));
$('#profileForm').addEventListener('submit',e=>{e.preventDefault();scope3=$('#scope3').checked;renderInventory();renderActions();updateAll();toast('企业画像与核算边界已更新');switchView('overview')});
$('#output').addEventListener('input',updateAll);

try{const s=JSON.parse(localStorage.getItem('localCarbonCopilot'));if(s){Object.entries(s.factors||{}).forEach(([k,v])=>{if(factors[k])factors[k].value=v});selected=new Set(s.selected||[]);scope3=s.scope3!==false;$('#output').value=s.output||120000;$('#companyName').value=s.company||$('#companyName').value;$('#district').value=s.district||$('#district').value;$('#industry').value=s.industry||$('#industry').value;$('#scope3').checked=scope3}}catch(e){}
renderInventory();renderActions();updateAll();
