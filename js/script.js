'use strict';

var data = {
	stats:{},
	groups:[],
};
var vm = new Vue({
	el: '#groups',
	data: {data:data},
	computed: {
		groups:function() {return this.data.groups; },
	},
});
Vue.component('group-item', {
	props: ['group'],
	template: `
		<a class="group" :href="group.groupId | href">
			<div class="volume"><span class="label">Last 24hrs: </span>{{ group.volume | volume}} BCH</div>
			<div class="cnt">/ {{ group.cnt }} trades</div>
			<div class="images">
				<span class="image" v-for="image in group.images" :style="{ 'background-image': 'url(' + image + ')' }" />
			</div>
		</a>
	`,
	filters: {
		href: function(value) {
			return 'https://www.juungle.net/#/collections/' + value;
		},
		volume: function(value) {
			return Math.floor(value/100000000) + '.' + zerofill(''+value%100000000, 8);
		},
	},
})

function zerofill(str, n) {
	if(str.length>=n) return str;
	return '0'.repeat(n-str.length) + str;
}




//var groups = [];

refreshStats(onStatsRefreshed);

function onStatsRefreshed(stats) {
	localStorage.setItem('storedStats', JSON.stringify(stats));
	
	let gStats = {};
	for(let h in stats) {
		for(let g in stats[h]) {
			gStats[g] ||= {groupId:g, cnt:0, volume:0, images:['','','','']};
			
			gStats[g].cnt += stats[h][g].cnt;
			gStats[g].volume += stats[h][g].volume;
		}
	}
	
	let groups = [];
	for(let g in gStats) {
		groups.push(gStats[g]);
	}
	groups.sort((a,b)=>(b.volume-a.volume));
	groups = groups.slice(0,11);
	
	data.groups = groups;
	
	groups.forEach((group)=>{
		getItemsByGroup(group.groupId, (response)=>{
			group.images = (response.nfts || []).map((item)=>(`https://www.juungle.net/api/v1/nfts/icon/${group.groupId}/${item.tokenId}`));
		});
	});

}

function refreshStats(cb) {
	let storedStats = JSON.parse(localStorage.getItem('storedStats') || '{}');
	
	let date = new Date();
	let h1 = new Date(date-3600000).toISOString().substr(0,13);
	if(storedStats[h1]) {
		cb(storedStats);
		return;
	}
	
	let toRefreshs = {};
	let stats = {};
	for(let i=1;i<=24;++i) {
		let h = new Date(date-3600000*i).toISOString().substr(0,13);
		toRefreshs[h] = !storedStats[h];
		stats[h] = storedStats[h] || {};
	}
	
	getPurchaseds((response)=>{
		if(!response.success) {
			alert('Something error');
			return;
		}
		
		response.nfts.forEach((item)=>{
			let h = item.purchaseTs.substr(0,13);
			if(!toRefreshs[h]) return;
			
			let group = item.groupTokenId;
			stats[h][group] ||= {cnt:0, volume:0};
			
			let stat = stats[h][group];
			++stat.cnt;
			stat.volume += item.priceSatoshis;
		});
		
		cb(stats);
	});
	
};


function getPurchaseds(cb) {
	let url = 'https://www.juungle.net/api/v1/nfts?purchaseTxidSet=true&sortBy=ts&sortDir=desc&limit=10000';
	
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function(){
		if (this.readyState!=4 || this.status!=200) return;
		
		cb(JSON.parse(this.responseText));
	}
	xhr.open('GET', url, true);
	xhr.send();
}

function getItemsByGroup(groupId, cb) {
	let url = `https://www.juungle.net/api/v1/nfts?groupTokenId=${groupId}&priceSatoshisSet=true&sortBy=ts&sortDir=desc&limit=4`;
	
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function(){
		if (this.readyState!=4 || this.status!=200) return;
		
		cb(JSON.parse(this.responseText));
	}
	xhr.open('GET', url, true);
	xhr.send();
}
