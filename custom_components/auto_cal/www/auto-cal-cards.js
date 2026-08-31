/*! auto-cal Lovelace cards — v0.4.1 — built from packages/frontend, do not edit */
"use strict";(()=>{var J=Object.defineProperty,Q=Object.defineProperties;var tt=Object.getOwnPropertyDescriptors;var R=Object.getOwnPropertySymbols;var et=Object.prototype.hasOwnProperty,rt=Object.prototype.propertyIsEnumerable;var D=(i,t,e)=>t in i?J(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,f=(i,t)=>{for(var e in t||(t={}))et.call(t,e)&&D(i,e,t[e]);if(R)for(var e of R(t))rt.call(t,e)&&D(i,e,t[e]);return i},j=(i,t)=>Q(i,tt(t));var m=(i,t,e)=>D(i,typeof t!="symbol"?t+"":t,e);var w=(i,t,e)=>new Promise((r,n)=>{var o=c=>{try{a(e.next(c))}catch(d){n(d)}},s=c=>{try{a(e.throw(c))}catch(d){n(d)}},a=c=>c.done?r(c.value):Promise.resolve(c.value).then(o,s);a((e=e.apply(i,t)).next())});var it=/^\s*([A-Za-z ]+):\s*(.*)$/,nt=new Set(["type","activity","priority","estimated"]),ot=/^(.*?)(?:-\d{4}-\d{2}-\d{2})?(?:@auto-cal)?(?:-\d{4}-\d{2}-\d{2})?$/;function st(i){var r,n;let t={activity:null,kind:null,priority:null,estimatedMinutes:null,notes:null};if(!i)return t;let e=[];for(let o of i.split(/\r\n|\r|\n|\\n/)){let s=it.exec(o),a=(r=s==null?void 0:s[1])==null?void 0:r.trim().toLowerCase(),c=(n=s==null?void 0:s[2])==null?void 0:n.trim();if(!s||!a||!c||!nt.has(a)){o.trim()&&e.push(o.trim());continue}switch(a){case"type":t.kind=c;break;case"activity":t.activity=c;break;case"priority":{let d=Number.parseInt(c,10);Number.isNaN(d)||(t.priority=d);break}case"estimated":{let d=at(c);d!==null&&(t.estimatedMinutes=d);break}}}return t.notes=e.length?e.join(`
`):null,t}function at(i){let t=/(\d+(?:\.\d+)?)\s*h/i.exec(i),e=/(\d+(?:\.\d+)?)\s*m/i.exec(i);if(t||e){let n=(t?Number.parseFloat(t[1])*60:0)+(e?Number.parseFloat(e[1]):0);return Math.round(n)}let r=Number.parseFloat(i);return Number.isNaN(r)?null:Math.round(r)}function ct(i){var e,r;if(!i)return null;let t=(r=(e=ot.exec(i))==null?void 0:e[1])==null?void 0:r.trim();return t||null}function $(i){var e,r;let t=st(i.description);return j(f({},i),{info:t,itemId:ct(i.uid),label:(r=(e=t.activity)!=null?e:i.summary)!=null?r:"Unknown"})}function T(i){return i instanceof Date&&!Number.isNaN(i.getTime())}function lt(i){return i<10?`0${i}`:String(i)}function p(i,t){if(!T(i))return"--:--";try{return i.toLocaleTimeString(t,{hour:"numeric",minute:"2-digit"})}catch(e){return`${i.getHours()}:${lt(i.getMinutes())}`}}function x(i){if(!Number.isFinite(i))return"0m";let t=Math.max(0,Math.round(i/6e4)),e=Math.floor(t/1440),r=Math.floor(t%1440/60),n=t%60;return e?r?`${e}d ${r}h`:`${e}d`:r?n?`${r}h ${n}m`:`${r}h`:`${n}m`}function z(i,t,e){let r=t.getTime()-i.getTime(),n=e.getTime()-i.getTime();return!Number.isFinite(r)||!Number.isFinite(n)||r<=0?1:Math.min(1,Math.max(0,n/r))}function S(i){let t=new Date(i);return t.setHours(0,0,0,0),t}function U(i,t){let e=new Date(i);return e.setDate(e.getDate()+t),e}function L(i){if(!i)return null;let t=String(i).trim().replace(" ","T").replace(/([+-]\d{2})(\d{2})$/,"$1:$2"),e=new Date(t);return T(e)?e:null}function q(i){var o;if(i.dateTime)return{date:L(i.dateTime),allDay:!1};let t=((o=i.date)!=null?o:"").split("-"),[e,r,n]=[Number(t[0]),Number(t[1]),Number(t[2])];return!Number.isFinite(e)||!Number.isFinite(r)||!Number.isFinite(n)?{date:null,allDay:!0}:{date:new Date(e,r-1,n),allDay:!0}}function B(i,t,e,r){return w(this,null,function*(){let n=`start=${encodeURIComponent(e.toISOString())}&end=${encodeURIComponent(r.toISOString())}`,o=yield Promise.all(t.map(a=>w(null,null,function*(){let c=yield i.callApi("GET",`calendars/${encodeURIComponent(a)}?${n}`);return(Array.isArray(c)?c:[]).map(d=>dt(d,a))}))),s=[];for(let a of o)for(let c of a)c&&s.push($(c));return s.sort((a,c)=>a.start.getTime()-c.start.getTime())})}function dt(i,t){var n,o,s,a,c;let e=q((n=i.start)!=null?n:{}),r=q((o=i.end)!=null?o:{});return!e.date||!r.date?null:{uid:(s=i.uid)!=null?s:`${t}-${e.date.getTime()}`,summary:(a=i.summary)!=null?a:"",description:(c=i.description)!=null?c:null,start:e.date,end:r.date,allDay:e.allDay,entityId:t}}function P(i,t){var u;let e=i.states[t],{message:r,start_time:n,end_time:o,description:s,all_day:a}=(u=e==null?void 0:e.attributes)!=null?u:{};if(!e||!r||!n||!o)return null;let c=L(n),d=L(o);return!c||!d?null:$({uid:`${t}-state`,summary:r,description:s!=null?s:null,start:c,end:d,allDay:!!a,entityId:t})}function H(i,t){var e;return(e=i.find(r=>r.start<=t&&r.end>t))!=null?e:null}function W(i,t){var e;return(e=i.find(r=>r.start>t))!=null?e:null}function ut(i){let t=0;for(let e=0;e<i.length;e++)t=(t<<5)-t+i.charCodeAt(e),t|=0;return Math.abs(t)}function h(i,t={}){if(!i)return"var(--secondary-text-color)";for(let[e,r]of Object.entries(t))if(e.toLowerCase()===i.toLowerCase())return r;return`hsl(${ut(i.toLowerCase())%360}, 58%, 52%)`}function l(i){return String(i!=null?i:"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function F(i,t,e){i.dispatchEvent(new CustomEvent(t,{detail:e,bubbles:!0,composed:!0}))}function E(i,t){F(i,"hass-more-info",{entityId:t})}function M(i,t){var e;N(t.type,i)&&(window.customCards=(e=window.customCards)!=null?e:[],window.customCards.some(r=>r.type===t.type)||window.customCards.push(t))}function N(i,t){try{return customElements.get(i)||customElements.define(i,t),!0}catch(e){return console.error(`auto-cal: could not define <${i}>`,e),!1}}var Y="auto_cal";function K(i,t){var r;let e=i.states[t];return String((r=e==null?void 0:e.attributes.friendly_name)!=null?r:t).toLowerCase()}function _(i){let t=Object.keys(i.states).filter(o=>o.startsWith("calendar.")),e=t.filter(o=>{var s,a;return((a=(s=i.entities)==null?void 0:s[o])==null?void 0:a.platform)===Y}),r=e.length?e:t.filter(o=>o.includes(Y)||K(i,o).includes("auto cal")),n=o=>K(i,o).includes("time block")||o.includes("time_block");return{schedule:r.find(o=>!n(o)),blocks:r.find(n)}}var g=`
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
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: var(--auto-cal-accent);
    color: var(--text-primary-color, #fff);
  }
  @supports (background: color-mix(in srgb, red 50%, transparent)) {
    .chip {
      background: color-mix(in srgb, var(--auto-cal-accent) 18%, transparent);
      color: var(--auto-cal-accent);
    }
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .error {
    color: var(--error-color, #db4437);
    font-size: 0.9rem;
  }
  .wrap {
    word-break: break-word;
    overflow-wrap: break-word;
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
    top: 0;
    bottom: 0;
    left: 0;
    border-radius: 3px;
    background: var(--auto-cal-accent);
  }
`;var mt=15e3,V=5*6e4,y=class extends HTMLElement{constructor(){super();m(this,"config");m(this,"hassObj");m(this,"events",[]);m(this,"loadError",null);m(this,"root");m(this,"ticker");m(this,"lastHtml","");m(this,"lastFetchAt",0);m(this,"lastStateStamp","");m(this,"fetching",!1);this.root=this.attachShadow({mode:"open"})}setConfig(e){this.config=this.validateConfig(e),this.lastFetchAt=0,this.lastHtml="",this.refresh()}set hass(e){this.hassObj=e;let r=this.entityIds().map(o=>{var s,a;return(a=(s=e.states[o])==null?void 0:s.last_changed)!=null?a:"?"}).join("|"),n=Date.now()-this.lastFetchAt>V;r!==this.lastStateStamp||n?(this.lastStateStamp=r,this.refresh()):this.render()}get hass(){return this.hassObj}connectedCallback(){this.ticker===void 0&&(this.ticker=setInterval(()=>this.onTick(),mt)),this.render()}disconnectedCallback(){clearInterval(this.ticker),this.ticker=void 0}afterRender(){}onTick(){Date.now()-this.lastFetchAt>V?this.refresh():this.render()}refresh(){this.render(),this.loadEvents()}loadEvents(){return w(this,null,function*(){let e=this.hassObj,r=this.config?this.entityIds():[];if(!e||!r.length||this.fetching)return;this.fetching=!0;let n=new Date,{start:o,end:s}=this.range(n);try{this.events=yield B(e,r,o,s),this.loadError=null}catch(a){this.loadError=a instanceof Error?a.message:String(a)}finally{this.fetching=!1,this.lastFetchAt=Date.now(),this.render()}})}render(){if(!this.config)return;let e;try{e=this.template(new Date)}catch(r){e=`<style>${g}</style><ha-card><div class="error">${l(r instanceof Error?r.message:String(r))}</div></ha-card>`}if(e!==this.lastHtml){this.lastHtml=e,this.root.innerHTML=e;try{this.afterRender()}catch(r){}}}query(e){return this.root.querySelector(e)}queryAll(e){return Array.from(this.root.querySelectorAll(e))}};var pt=36,ft=2,k=class extends y{static getConfigElement(){var t;return(t=window.loadCardHelpers)==null||t.call(window),document.createElement("auto-cal-activity-card-editor")}static getStubConfig(t){let{schedule:e,blocks:r}=_(t);return{entity:e!=null?e:"",blocks_entity:r}}getCardSize(){return 3}validateConfig(t){if(!(t!=null&&t.entity))throw new Error("auto-cal-activity-card: `entity` is required");if(!t.entity.startsWith("calendar."))throw new Error("auto-cal-activity-card: `entity` must be a calendar entity");return f({show_next:!0,show_progress:!0,show_details:!0},t)}entityIds(){return[this.config.entity,this.config.blocks_entity].filter(t=>!!t)}range(t){return{start:new Date(t.getTime()-ft*36e5),end:new Date(t.getTime()+pt*36e5)}}afterRender(){var t;(t=this.query("ha-card"))==null||t.addEventListener("click",()=>{E(this,this.config.entity)})}template(t){var u,v;let e=this.events.filter(b=>b.entityId===this.config.entity),r=this.config.blocks_entity?this.events.filter(b=>b.entityId===this.config.blocks_entity):[],n=this.hass&&!e.length?P(this.hass,this.config.entity):null,o=e.length?e:n?[n]:[],s=H(o,t),a=W(o,t),c=H(r,t),d=h((u=s==null?void 0:s.label)!=null?u:c==null?void 0:c.label,(v=this.config.activity_colors)!=null?v:{});return`
      <style>
        ${g}
        ha-card { cursor: pointer; }
        .activity {
          font-size: 1.9rem;
          font-weight: 700;
          line-height: 1.15;
          color: var(--auto-cal-accent);
          margin: 8px 0 2px;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .idle .activity { color: var(--primary-text-color); }
        .summary {
          font-size: 1.05rem;
          margin-bottom: 2px;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .facts {
          display: flex;
          flex-wrap: wrap;
          font-size: 0.85rem;
          color: var(--secondary-text-color);
        }
        /* Spacing as margins: flex gap is ignored before Safari 14.1. */
        .facts > span { margin: 0 10px 4px 0; }
        .top { display: flex; align-items: center; justify-content: space-between; }
        .top > * + * { margin-left: 8px; }
        .slot { font-size: 0.85rem; color: var(--secondary-text-color); white-space: nowrap; }
        .progress { margin-top: 14px; }
        .progress > * + * { margin-top: 6px; }
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
          font-size: 0.9rem;
        }
        .next > * + * { margin-left: 8px; }
        .next .dot {
          width: 8px; height: 8px; border-radius: 50%;
          flex: 0 0 auto; align-self: center;
        }
        .next .when { color: var(--secondary-text-color); white-space: nowrap; }
        .next .what {
          font-weight: 600;
          word-break: break-word;
          overflow-wrap: break-word;
        }
      </style>
      <ha-card style="--auto-cal-accent: ${l(d)}">
        ${this.config.name?`<div class="header">${l(this.config.name)}</div>`:""}
        ${this.loadError?`<div class="error">${l(this.loadError)}</div>`:""}
        ${s?this.renderCurrent(s,c,t):this.renderIdle(a,c,t)}
        ${this.config.show_next?this.renderNext(a,t):""}
      </ha-card>
    `}renderCurrent(t,e,r){let n=this.config.show_details&&t.summary&&t.summary!==t.label;return`
      <div class="top">
        <span class="chip">Now</span>
        <span class="slot">${l(p(t.start,this.locale))}\u2013${l(p(t.end,this.locale))}</span>
      </div>
      <div class="activity">${l(t.label)}</div>
      ${n?`<div class="summary">${l(t.summary)}</div>`:""}
      ${this.config.show_details?`<div class="facts">${this.facts(t,e)}</div>`:""}
      ${this.config.show_progress?this.renderProgress(t,r):""}
    `}renderIdle(t,e,r){return`
      <div class="idle">
        <div class="top"><span class="chip">Free</span></div>
        <div class="activity">Nothing scheduled</div>
        <div class="facts">${e?`You are in the <b>${l(e.label)}</b> block until ${l(p(e.end,this.locale))}`:t?`Free for ${l(x(t.start.getTime()-r.getTime()))}`:"Nothing scheduled"}</div>
      </div>
    `}renderProgress(t,e){let r=z(t.start,t.end,e),n=x(t.end.getTime()-e.getTime());return`
      <div class="progress">
        <div class="bar"><div class="fill" style="width: ${(r*100).toFixed(1)}%"></div></div>
        <div class="labels">
          <span>${l(n)} left</span>
          <span>${Math.round(r*100)}%</span>
        </div>
      </div>
    `}renderNext(t,e){var o;if(!t)return"";let r=h(t.label,(o=this.config.activity_colors)!=null?o:{}),n=x(t.start.getTime()-e.getTime());return`
      <div class="next">
        <span class="dot" style="background: ${l(r)}"></span>
        <span class="what">${l(t.label)}</span>
        <span class="when">${l(t.summary&&t.summary!==t.label?`\xB7 ${t.summary} `:"")}\xB7 ${l(p(t.start,this.locale))} (in ${l(n)})</span>
      </div>
    `}facts(t,e){let r=[];return t.info.kind&&r.push(l(t.info.kind)),t.info.estimatedMinutes!==null&&r.push(`~${l(x(t.info.estimatedMinutes*6e4))}`),t.info.priority!==null&&r.push(`Priority ${l(t.info.priority)}`),e&&e.label!==t.label&&r.push(`in ${l(e.label)}`),r.map(n=>`<span>${n}</span>`).join("")}get locale(){var t,e,r,n;return(n=(e=(t=this.hass)==null?void 0:t.locale)==null?void 0:e.language)!=null?n:(r=this.hass)==null?void 0:r.language}};function I(i,t,e){class r extends HTMLElement{constructor(){super(...arguments);m(this,"config",{type:""});m(this,"hassObj");m(this,"form")}setConfig(s){this.config=s,this.render()}set hass(s){this.hassObj=s,this.render()}connectedCallback(){this.render()}render(){if(this.hassObj){if(!this.form){let s=document.createElement("ha-form");s.schema=t,s.computeLabel=a=>{var c;return(c=e[a.name])!=null?c:a.name},s.addEventListener("value-changed",a=>{let c=a.detail;F(this,"config-changed",{config:c.value})}),this.form=s,this.append(s)}this.form.hass=this.hassObj,this.form.data=this.config}}}N(i,r)}var C={entity:{filter:[{domain:"calendar"}]}};var G=7,X=22,A=class extends y{static getConfigElement(){var t;return(t=window.loadCardHelpers)==null||t.call(window),document.createElement("auto-cal-timeline-card-editor")}static getStubConfig(t){let{schedule:e,blocks:r}=_(t);return{entity:e!=null?e:"",blocks_entity:r}}getCardSize(){return 4}validateConfig(t){if(!(t!=null&&t.entity))throw new Error("auto-cal-activity-timeline-card: `entity` is required");return f({show_list:!0},t)}entityIds(){return[this.config.entity,this.config.blocks_entity].filter(t=>!!t)}range(t){let e=S(t);return{start:e,end:U(e,1)}}afterRender(){var t;(t=this.query("ha-card"))==null||t.addEventListener("click",()=>{E(this,this.config.entity)})}template(t){var d;let e=S(t),r=this.events.filter(u=>u.entityId===this.config.entity),n=this.config.blocks_entity?this.events.filter(u=>u.entityId===this.config.blocks_entity):[],[o,s]=this.bounds(r.concat(n),e,t),a=u=>((u.getTime()-e.getTime())/36e5-o)/(s-o)*100,c=r.filter(u=>u.end>t);return`
      <style>
        ${g}
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
        /* Margins rather than gap: flex gap is ignored before Safari 14.1. */
        .list { margin-top: 12px; }
        .list > .row + .row { margin-top: 8px; }
        .row { display: flex; align-items: baseline; font-size: 0.9rem; }
        .row > * + * { margin-left: 8px; }
        .row .dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; align-self: center; }
        .row .time { color: var(--secondary-text-color); white-space: nowrap; font-variant-numeric: tabular-nums; }
        .row .what { font-weight: 600; }
        .row .detail {
          color: var(--secondary-text-color);
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .empty { color: var(--secondary-text-color); font-size: 0.9rem; margin-top: 12px; }
      </style>
      <ha-card>
        <div class="header">${l((d=this.config.name)!=null?d:"Today")}</div>
        ${this.loadError?`<div class="error">${l(this.loadError)}</div>`:""}
        ${n.length?`<div class="lane blocks">${this.segments(n,a,t,!1)}</div>`:""}
        <div class="lane">
          ${this.segments(r,a,t,!0)}
          ${this.nowMarker(a(t))}
        </div>
        <div class="ticks">${this.ticks(o,s,e,a)}</div>
        ${this.config.show_list?this.renderList(c,t):""}
      </ha-card>
    `}bounds(t,e,r){if(this.config.start_hour!==void 0&&this.config.end_hour!==void 0)return[this.config.start_hour,this.config.end_hour];let n=d=>(d.getTime()-e.getTime())/36e5,o=[];for(let d of t)o.push(n(d.start),n(d.end));o.push(n(r));let s=o.filter(d=>Number.isFinite(d)),a=Math.max(0,Math.floor(Math.min(G,...s))),c=Math.min(24,Math.ceil(Math.max(X,...s)));return a<c?[a,c]:[G,X]}segments(t,e,r,n){return t.map(o=>{var O;let s=e(o.start),a=e(o.end),c=a-s;if(!Number.isFinite(s)||!Number.isFinite(c)||a<=0||s>=100||c<=0)return"";let d=Math.max(0,s),u=h(o.label,(O=this.config.activity_colors)!=null?O:{}),v=o.end<=r?" past":"",b=`${p(o.start,this.locale)}\u2013${p(o.end,this.locale)} ${o.label}`;return`<div class="seg${v}" style="left:${d.toFixed(2)}%;width:${Math.min(100-d,c).toFixed(2)}%;background:${l(u)}" title="${l(b)}">${n?l(o.label):""}</div>`}).join("")}nowMarker(t){return!Number.isFinite(t)||t<0||t>100?"":`<div class="now" style="left:${t.toFixed(2)}%"></div>`}ticks(t,e,r,n){let o=e-t,s=o>12?4:o>6?2:1,a=[];for(let c=Math.ceil(t);c<=e;c+=s){let d=new Date(r.getTime()+c*36e5);a.push(`<span class="tick" style="left:${n(d).toFixed(2)}%">${l(p(d,this.locale))}</span>`)}return a.join("")}renderList(t,e){return t.length?`<div class="list">${t.map(r=>{var a;let n=h(r.label,(a=this.config.activity_colors)!=null?a:{}),o=r.start<=e&&r.end>e,s=r.summary&&r.summary!==r.label?`<span class="detail">${l(r.summary)}</span>`:"";return`
          <div class="row">
            <span class="dot" style="background:${l(n)}"></span>
            <span class="time">${l(p(r.start,this.locale))}</span>
            <span class="what">${l(r.label)}</span>
            ${s}
            ${o?`<span class="chip" style="--auto-cal-accent:${l(n)}">now</span>`:""}
          </div>`}).join("")}</div>`:'<div class="empty">Nothing left on the schedule today.</div>'}get locale(){var t,e,r,n;return(n=(e=(t=this.hass)==null?void 0:t.locale)==null?void 0:e.language)!=null?n:(r=this.hass)==null?void 0:r.language}};var Z="https://github.com/vantreeseba/auto_cal_ha_integration#lovelace-cards";M(k,{type:"auto-cal-activity-card",name:"Auto Cal: Current Activity",description:"What you should be doing right now, from an Auto Cal calendar.",preview:!0,documentationURL:Z});M(A,{type:"auto-cal-activity-timeline-card",name:"Auto Cal: Activity Timeline",description:"Today's Auto Cal schedule as a lane coloured by activity type.",preview:!0,documentationURL:Z});I("auto-cal-activity-card-editor",[{name:"entity",required:!0,selector:C},{name:"blocks_entity",selector:C},{name:"name",selector:{text:{}}},{name:"show_details",selector:{boolean:{}}},{name:"show_progress",selector:{boolean:{}}},{name:"show_next",selector:{boolean:{}}}],{entity:"Schedule calendar",blocks_entity:"Time blocks calendar (optional)",name:"Card title",show_details:"Show item details",show_progress:"Show progress bar",show_next:"Show what's next"});I("auto-cal-timeline-card-editor",[{name:"entity",required:!0,selector:C},{name:"blocks_entity",selector:C},{name:"name",selector:{text:{}}},{name:"start_hour",selector:{number:{min:0,max:23,mode:"box"}}},{name:"end_hour",selector:{number:{min:1,max:24,mode:"box"}}},{name:"show_list",selector:{boolean:{}}}],{entity:"Schedule calendar",blocks_entity:"Time blocks calendar (optional)",name:"Card title",start_hour:"First hour shown",end_hour:"Last hour shown",show_list:"Show list of remaining items"});console.info("%c AUTO-CAL CARDS %c v0.4.1 ","color: white; background: #6366f1; font-weight: 700;","color: #6366f1; background: white; font-weight: 700;");})();
