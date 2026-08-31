/*! auto-cal Lovelace cards — v0.4.0 — built from packages/frontend, do not edit */
"use strict";(()=>{var P=Object.defineProperty;var W=(r,t,e)=>t in r?P(r,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):r[t]=e;var m=(r,t,e)=>W(r,typeof t!="symbol"?t+"":t,e);var Y=/^\s*([A-Za-z ]+):\s*(.*)$/,K=new Set(["type","activity","priority","estimated"]),V=/^(.*?)(?:-\d{4}-\d{2}-\d{2})?(?:@auto-cal)?(?:-\d{4}-\d{2}-\d{2})?$/;function G(r){let t={activity:null,kind:null,priority:null,estimatedMinutes:null,notes:null};if(!r)return t;let e=[];for(let i of r.split(/\r\n|\r|\n|\\n/)){let n=Y.exec(i),s=n?.[1]?.trim().toLowerCase(),o=n?.[2]?.trim();if(!n||!s||!o||!K.has(s)){i.trim()&&e.push(i.trim());continue}switch(s){case"type":t.kind=o;break;case"activity":t.activity=o;break;case"priority":{let a=Number.parseInt(o,10);Number.isNaN(a)||(t.priority=a);break}case"estimated":{let a=X(o);a!==null&&(t.estimatedMinutes=a);break}}}return t.notes=e.length?e.join(`
`):null,t}function X(r){let t=/(\d+(?:\.\d+)?)\s*h/i.exec(r),e=/(\d+(?:\.\d+)?)\s*m/i.exec(r);if(t||e){let n=(t?Number.parseFloat(t[1])*60:0)+(e?Number.parseFloat(e[1]):0);return Math.round(n)}let i=Number.parseFloat(r);return Number.isNaN(i)?null:Math.round(i)}function Z(r){if(!r)return null;let t=V.exec(r)?.[1]?.trim();return t||null}function E(r){let t=G(r.description);return{...r,info:t,itemId:Z(r.uid),label:t.activity??r.summary??"Unknown"}}function $(r){if(r.dateTime)return{date:new Date(r.dateTime),allDay:!1};let[t,e,i]=(r.date??"").split("-").map(Number);return{date:new Date(t??1970,(e??1)-1,i??1),allDay:!0}}async function S(r,t,e,i){let n=`start=${encodeURIComponent(e.toISOString())}&end=${encodeURIComponent(i.toISOString())}`;return(await Promise.all(t.map(async o=>(await r.callApi("GET",`calendars/${o}?${n}`)).map(l=>J(l,o))))).flat().map(E).sort((o,a)=>o.start.getTime()-a.start.getTime())}function J(r,t){let e=$(r.start),i=$(r.end);return{uid:r.uid??`${t}-${e.date.toISOString()}`,summary:r.summary??"",description:r.description??null,start:e.date,end:i.date,allDay:e.allDay,entityId:t}}function L(r,t){let e=r.states[t],{message:i,start_time:n,end_time:s,description:o,all_day:a}=e?.attributes??{};return!e||!i||!n||!s?null:E({uid:`${t}-state`,summary:i,description:o??null,start:new Date(n.replace(" ","T")),end:new Date(s.replace(" ","T")),allDay:!!a,entityId:t})}function _(r,t){return r.find(e=>e.start<=t&&e.end>t)??null}function H(r,t){return r.find(e=>e.start>t)??null}function Q(r){let t=0;for(let e=0;e<r.length;e++)t=(t<<5)-t+r.charCodeAt(e),t|=0;return Math.abs(t)}function h(r,t={}){if(!r)return"var(--secondary-text-color)";for(let[e,i]of Object.entries(t))if(e.toLowerCase()===r.toLowerCase())return i;return`hsl(${Q(r.toLowerCase())%360}, 58%, 52%)`}function c(r){return String(r??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function A(r,t,e){r.dispatchEvent(new CustomEvent(t,{detail:e,bubbles:!0,composed:!0}))}function y(r,t){A(r,"hass-more-info",{entityId:t})}function D(r,t){customElements.get(t.type)||customElements.define(t.type,r),window.customCards=window.customCards??[],window.customCards.some(e=>e.type===t.type)||window.customCards.push(t)}function M(r,t){customElements.get(r)||customElements.define(r,t)}var O="auto_cal";function I(r,t){let e=r.states[t];return String(e?.attributes.friendly_name??t).toLowerCase()}function b(r){let t=Object.keys(r.states).filter(s=>s.startsWith("calendar.")),e=t.filter(s=>r.entities?.[s]?.platform===O),i=e.length?e:t.filter(s=>s.includes(O)||I(r,s).includes("auto cal")),n=s=>I(r,s).includes("time block")||s.includes("time_block");return{schedule:i.find(s=>!n(s)),blocks:i.find(n)}}var x=`
  :host {
    --auto-cal-accent: var(--primary-color);
    display: block;
  }
  ha-card {
    padding: 16px;
    height: 100%;
    box-sizing: border-box;
  }
  .header {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--secondary-text-color);
    margin-bottom: 8px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: color-mix(in srgb, var(--auto-cal-accent) 18%, transparent);
    color: var(--auto-cal-accent);
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .error {
    color: var(--error-color, #db4437);
    font-size: 0.9rem;
  }
  .bar {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: var(--divider-color);
    overflow: hidden;
  }
  .bar > .fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 3px;
    background: var(--auto-cal-accent);
  }
`;function u(r,t){return r.toLocaleTimeString(t,{hour:"numeric",minute:"2-digit"})}function g(r){let t=Math.max(0,Math.round(r/6e4)),e=Math.floor(t/1440),i=Math.floor(t%1440/60),n=t%60;return e?i?`${e}d ${i}h`:`${e}d`:i?n?`${i}h ${n}m`:`${i}h`:`${n}m`}function F(r,t,e){let i=t.getTime()-r.getTime();return i<=0?1:Math.min(1,Math.max(0,(e.getTime()-r.getTime())/i))}function k(r){let t=new Date(r);return t.setHours(0,0,0,0),t}function R(r,t){let e=new Date(r);return e.setDate(e.getDate()+t),e}var tt=15e3,N=5*6e4,f=class extends HTMLElement{constructor(){super();m(this,"config");m(this,"hassObj");m(this,"events",[]);m(this,"loadError",null);m(this,"root");m(this,"ticker");m(this,"lastHtml","");m(this,"lastFetchAt",0);m(this,"lastStateStamp","");m(this,"fetching",!1);this.root=this.attachShadow({mode:"open"})}setConfig(e){this.config=this.validateConfig(e),this.lastFetchAt=0,this.lastHtml="",this.refresh()}set hass(e){this.hassObj=e;let i=this.entityIds().map(s=>e.states[s]?.last_changed??"?").join("|"),n=Date.now()-this.lastFetchAt>N;i!==this.lastStateStamp||n?(this.lastStateStamp=i,this.refresh()):this.render()}get hass(){return this.hassObj}connectedCallback(){this.ticker??=setInterval(()=>this.onTick(),tt),this.render()}disconnectedCallback(){clearInterval(this.ticker),this.ticker=void 0}afterRender(){}onTick(){Date.now()-this.lastFetchAt>N?this.refresh():this.render()}refresh(){this.render(),this.loadEvents()}async loadEvents(){let e=this.hassObj,i=this.config?this.entityIds():[];if(!e||!i.length||this.fetching)return;this.fetching=!0;let n=new Date,{start:s,end:o}=this.range(n);try{this.events=await S(e,i,s,o),this.loadError=null}catch(a){this.loadError=a instanceof Error?a.message:String(a)}finally{this.fetching=!1,this.lastFetchAt=Date.now(),this.render()}}render(){if(!this.config)return;let e=this.template(new Date);e!==this.lastHtml&&(this.lastHtml=e,this.root.innerHTML=e,this.afterRender())}query(e){return this.root.querySelector(e)}queryAll(e){return Array.from(this.root.querySelectorAll(e))}};var et=36,rt=2,w=class extends f{static getConfigElement(){return window.loadCardHelpers?.(),document.createElement("auto-cal-activity-card-editor")}static getStubConfig(t){let{schedule:e,blocks:i}=b(t);return{entity:e??"",blocks_entity:i}}getCardSize(){return 3}validateConfig(t){if(!t?.entity)throw new Error("auto-cal-activity-card: `entity` is required");if(!t.entity.startsWith("calendar."))throw new Error("auto-cal-activity-card: `entity` must be a calendar entity");return{show_next:!0,show_progress:!0,show_details:!0,...t}}entityIds(){return[this.config.entity,this.config.blocks_entity].filter(t=>!!t)}range(t){return{start:new Date(t.getTime()-rt*36e5),end:new Date(t.getTime()+et*36e5)}}afterRender(){this.query("ha-card")?.addEventListener("click",()=>{y(this,this.config.entity)})}template(t){let e=this.events.filter(p=>p.entityId===this.config.entity),i=this.config.blocks_entity?this.events.filter(p=>p.entityId===this.config.blocks_entity):[],n=this.hass&&!e.length?L(this.hass,this.config.entity):null,s=e.length?e:n?[n]:[],o=_(s,t),a=H(s,t),l=_(i,t),d=h(o?.label??l?.label,this.config.activity_colors??{});return`
      <style>
        ${x}
        ha-card { cursor: pointer; }
        .activity {
          font-size: 1.9rem;
          font-weight: 700;
          line-height: 1.15;
          color: var(--auto-cal-accent);
          margin: 8px 0 2px;
          overflow-wrap: anywhere;
        }
        .idle .activity { color: var(--primary-text-color); }
        .summary { font-size: 1.05rem; margin-bottom: 2px; overflow-wrap: anywhere; }
        .facts {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 10px;
          font-size: 0.85rem;
          color: var(--secondary-text-color);
        }
        .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .slot { font-size: 0.85rem; color: var(--secondary-text-color); white-space: nowrap; }
        .progress { margin-top: 14px; display: grid; gap: 6px; }
        .progress .labels {
          display: flex; justify-content: space-between;
          font-size: 0.8rem; color: var(--secondary-text-color);
        }
        .next {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid var(--divider-color);
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 0.9rem;
        }
        .next .dot {
          width: 8px; height: 8px; border-radius: 50%;
          flex: 0 0 auto; align-self: center;
        }
        .next .when { color: var(--secondary-text-color); white-space: nowrap; }
        .next .what { font-weight: 600; overflow-wrap: anywhere; }
      </style>
      <ha-card style="--auto-cal-accent: ${c(d)}">
        ${this.config.name?`<div class="header">${c(this.config.name)}</div>`:""}
        ${this.loadError?`<div class="error">${c(this.loadError)}</div>`:""}
        ${o?this.renderCurrent(o,l,t):this.renderIdle(a,l,t)}
        ${this.config.show_next?this.renderNext(a,t):""}
      </ha-card>
    `}renderCurrent(t,e,i){let n=this.config.show_details&&t.summary&&t.summary!==t.label;return`
      <div class="top">
        <span class="chip">Now</span>
        <span class="slot">${c(u(t.start,this.locale))}\u2013${c(u(t.end,this.locale))}</span>
      </div>
      <div class="activity">${c(t.label)}</div>
      ${n?`<div class="summary">${c(t.summary)}</div>`:""}
      ${this.config.show_details?`<div class="facts">${this.facts(t,e)}</div>`:""}
      ${this.config.show_progress?this.renderProgress(t,i):""}
    `}renderIdle(t,e,i){return`
      <div class="idle">
        <div class="top"><span class="chip">Free</span></div>
        <div class="activity">Nothing scheduled</div>
        <div class="facts">${e?`You are in the <b>${c(e.label)}</b> block until ${c(u(e.end,this.locale))}`:t?`Free for ${c(g(t.start.getTime()-i.getTime()))}`:"Nothing scheduled"}</div>
      </div>
    `}renderProgress(t,e){let i=F(t.start,t.end,e),n=g(t.end.getTime()-e.getTime());return`
      <div class="progress">
        <div class="bar"><div class="fill" style="width: ${(i*100).toFixed(1)}%"></div></div>
        <div class="labels">
          <span>${c(n)} left</span>
          <span>${Math.round(i*100)}%</span>
        </div>
      </div>
    `}renderNext(t,e){if(!t)return"";let i=h(t.label,this.config.activity_colors??{}),n=g(t.start.getTime()-e.getTime());return`
      <div class="next">
        <span class="dot" style="background: ${c(i)}"></span>
        <span class="what">${c(t.label)}</span>
        <span class="when">${c(t.summary&&t.summary!==t.label?`\xB7 ${t.summary} `:"")}\xB7 ${c(u(t.start,this.locale))} (in ${c(n)})</span>
      </div>
    `}facts(t,e){let i=[];return t.info.kind&&i.push(c(t.info.kind)),t.info.estimatedMinutes!==null&&i.push(`~${c(g(t.info.estimatedMinutes*6e4))}`),t.info.priority!==null&&i.push(`Priority ${c(t.info.priority)}`),e&&e.label!==t.label&&i.push(`in ${c(e.label)}`),i.map(n=>`<span>${n}</span>`).join("")}get locale(){return this.hass?.locale?.language??this.hass?.language}};function T(r,t,e){class i extends HTMLElement{constructor(){super(...arguments);m(this,"config",{type:""});m(this,"hassObj");m(this,"form")}setConfig(o){this.config=o,this.render()}set hass(o){this.hassObj=o,this.render()}connectedCallback(){this.render()}render(){if(this.hassObj){if(!this.form){let o=document.createElement("ha-form");o.schema=t,o.computeLabel=a=>e[a.name]??a.name,o.addEventListener("value-changed",a=>{let l=a.detail;A(this,"config-changed",{config:l.value})}),this.form=o,this.append(o)}this.form.hass=this.hassObj,this.form.data=this.config}}}M(r,i)}var v={entity:{filter:[{domain:"calendar"}]}};var j=7,z=22,C=class extends f{static getConfigElement(){return window.loadCardHelpers?.(),document.createElement("auto-cal-timeline-card-editor")}static getStubConfig(t){let{schedule:e,blocks:i}=b(t);return{entity:e??"",blocks_entity:i}}getCardSize(){return 4}validateConfig(t){if(!t?.entity)throw new Error("auto-cal-activity-timeline-card: `entity` is required");return{show_list:!0,...t}}entityIds(){return[this.config.entity,this.config.blocks_entity].filter(t=>!!t)}range(t){let e=k(t);return{start:e,end:R(e,1)}}afterRender(){this.query("ha-card")?.addEventListener("click",()=>{y(this,this.config.entity)})}template(t){let e=k(t),i=this.events.filter(d=>d.entityId===this.config.entity),n=this.config.blocks_entity?this.events.filter(d=>d.entityId===this.config.blocks_entity):[],[s,o]=this.bounds(i.concat(n),e,t),a=d=>((d.getTime()-e.getTime())/36e5-s)/(o-s)*100,l=i.filter(d=>d.end>t);return`
      <style>
        ${x}
        ha-card { cursor: pointer; }
        .lane {
          position: relative;
          height: 34px;
          border-radius: 6px;
          background: var(--divider-color);
          overflow: hidden;
        }
        .lane.blocks { height: 10px; margin-bottom: 4px; opacity: 0.45; }
        .seg {
          position: absolute;
          top: 0;
          bottom: 0;
          border-radius: 4px;
          display: flex;
          align-items: center;
          padding: 0 6px;
          box-sizing: border-box;
          font-size: 0.72rem;
          font-weight: 600;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          white-space: nowrap;
        }
        .seg.past { opacity: 0.45; }
        .now {
          position: absolute;
          top: -4px;
          bottom: -4px;
          width: 2px;
          background: var(--error-color, #db4437);
          z-index: 2;
        }
        .ticks {
          position: relative;
          height: 14px;
          margin-top: 4px;
          font-size: 0.68rem;
          color: var(--secondary-text-color);
        }
        .tick { position: absolute; transform: translateX(-50%); }
        .list { margin-top: 12px; display: grid; gap: 8px; }
        .row { display: flex; align-items: baseline; gap: 8px; font-size: 0.9rem; }
        .row .dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; align-self: center; }
        .row .time { color: var(--secondary-text-color); white-space: nowrap; font-variant-numeric: tabular-nums; }
        .row .what { font-weight: 600; }
        .row .detail { color: var(--secondary-text-color); overflow-wrap: anywhere; }
        .empty { color: var(--secondary-text-color); font-size: 0.9rem; margin-top: 12px; }
      </style>
      <ha-card>
        <div class="header">${c(this.config.name??"Today")}</div>
        ${this.loadError?`<div class="error">${c(this.loadError)}</div>`:""}
        ${n.length?`<div class="lane blocks">${this.segments(n,a,t,!1)}</div>`:""}
        <div class="lane">
          ${this.segments(i,a,t,!0)}
          ${this.nowMarker(a(t))}
        </div>
        <div class="ticks">${this.ticks(s,o,e,a)}</div>
        ${this.config.show_list?this.renderList(l,t):""}
      </ha-card>
    `}bounds(t,e,i){if(this.config.start_hour!==void 0&&this.config.end_hour!==void 0)return[this.config.start_hour,this.config.end_hour];let n=l=>(l.getTime()-e.getTime())/36e5,s=t.flatMap(l=>[n(l.start),n(l.end)]);s.push(n(i));let o=Math.max(0,Math.floor(Math.min(j,...s))),a=Math.min(24,Math.ceil(Math.max(z,...s)));return o<a?[o,a]:[j,z]}segments(t,e,i,n){return t.map(s=>{let o=e(s.start),a=e(s.end),l=a-o;if(a<=0||o>=100||l<=0)return"";let d=Math.max(0,o),p=h(s.label,this.config.activity_colors??{}),q=s.end<=i?" past":"",B=`${u(s.start,this.locale)}\u2013${u(s.end,this.locale)} ${s.label}`;return`<div class="seg${q}" style="left:${d.toFixed(2)}%;width:${Math.min(100-d,l).toFixed(2)}%;background:${c(p)}" title="${c(B)}">${n?c(s.label):""}</div>`}).join("")}nowMarker(t){return t<0||t>100?"":`<div class="now" style="left:${t.toFixed(2)}%"></div>`}ticks(t,e,i,n){let s=e-t,o=s>12?4:s>6?2:1,a=[];for(let l=Math.ceil(t);l<=e;l+=o){let d=new Date(i.getTime()+l*36e5);a.push(`<span class="tick" style="left:${n(d).toFixed(2)}%">${c(u(d,this.locale))}</span>`)}return a.join("")}renderList(t,e){return t.length?`<div class="list">${t.map(i=>{let n=h(i.label,this.config.activity_colors??{}),s=i.start<=e&&i.end>e,o=i.summary&&i.summary!==i.label?`<span class="detail">${c(i.summary)}</span>`:"";return`
          <div class="row">
            <span class="dot" style="background:${c(n)}"></span>
            <span class="time">${c(u(i.start,this.locale))}</span>
            <span class="what">${c(i.label)}</span>
            ${o}
            ${s?`<span class="chip" style="--auto-cal-accent:${c(n)}">now</span>`:""}
          </div>`}).join("")}</div>`:'<div class="empty">Nothing left on the schedule today.</div>'}get locale(){return this.hass?.locale?.language??this.hass?.language}};var U="https://github.com/vantreeseba/auto_cal_ha_integration#lovelace-cards";D(w,{type:"auto-cal-activity-card",name:"Auto Cal: Current Activity",description:"What you should be doing right now, from an Auto Cal calendar.",preview:!0,documentationURL:U});D(C,{type:"auto-cal-activity-timeline-card",name:"Auto Cal: Activity Timeline",description:"Today's Auto Cal schedule as a lane coloured by activity type.",preview:!0,documentationURL:U});T("auto-cal-activity-card-editor",[{name:"entity",required:!0,selector:v},{name:"blocks_entity",selector:v},{name:"name",selector:{text:{}}},{name:"show_details",selector:{boolean:{}}},{name:"show_progress",selector:{boolean:{}}},{name:"show_next",selector:{boolean:{}}}],{entity:"Schedule calendar",blocks_entity:"Time blocks calendar (optional)",name:"Card title",show_details:"Show item details",show_progress:"Show progress bar",show_next:"Show what's next"});T("auto-cal-timeline-card-editor",[{name:"entity",required:!0,selector:v},{name:"blocks_entity",selector:v},{name:"name",selector:{text:{}}},{name:"start_hour",selector:{number:{min:0,max:23,mode:"box"}}},{name:"end_hour",selector:{number:{min:1,max:24,mode:"box"}}},{name:"show_list",selector:{boolean:{}}}],{entity:"Schedule calendar",blocks_entity:"Time blocks calendar (optional)",name:"Card title",start_hour:"First hour shown",end_hour:"Last hour shown",show_list:"Show list of remaining items"});console.info("%c AUTO-CAL CARDS %c v0.4.0 ","color: white; background: #6366f1; font-weight: 700;","color: #6366f1; background: white; font-weight: 700;");})();
