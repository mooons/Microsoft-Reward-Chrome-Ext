const _maxPCSearch = 35;
const _maxMbSearch = 25;
const STATUS_NONE = 0;
const STATUS_BUSY = 1;
const STATUS_DONE = 20;
const STATUS_WARNING = 30;
const STATUS_ERROR = 3;

var _questingStatus = {
	searchQuesting : STATUS_NONE,
	promoQuesting : STATUS_NONE,
	sendPromoCompletionNotification : false,
	sendSearchCompletionNotification : false
}


function checkQuests() {
	setBadge(STATUS_BUSY);
	if (!checkDate()) {
		// if a new day, reset variables
		_pcSearchWordIdx = 0;
		_mbSearchWordIdx = 0;
		_currentGoogleTrendPageIdx = 0;
		_usedAllGoogleTrendPageNotificationFired = false;
		_currentSearchType = NaN;
		_searchWordArray = new Array();
	}

	checkCompletionStatus();

	if (_status.dailyPoint.complete)
	{
		// if completed
		_questingStatus.promoQuesting = STATUS_DONE;
		_questingStatus.searchQuesting = STATUS_DONE;
		setCompletion();
		return;
	} else {
		_questingStatus.promoQuesting = STATUS_BUSY;
		_questingStatus.searchQuesting = STATUS_BUSY;
		// check search quests
		if (!_status.pcSearch.complete || !_status.mbSearch.complete){
			doSearchQuests();
		} else {			
			_questingStatus.searchQuesting = STATUS_DONE;
		}
		// check promotion quests		
		doPromotionQuests();
	}
}

function setCompletion() {
	if ((_questingStatus.promoQuesting + _questingStatus.searchQuesting) >= (STATUS_DONE * 2)) {
		// both are complete or one of them is completed and the other is warning or both are warning
		if (_status.dailyPoint.complete) {
			setBadge(STATUS_DONE);
		} else {
			setBadge(STATUS_WARNING);
		}
	}
	if (_questingStatus.promoQuesting == STATUS_DONE && _questingStatus.sendPromoCompletionNotification) {
		_questingStatus.sendPromoCompletionNotification = false;
		let p = 0, pm = 0;
		for (var i in _status.morePromotions) {
			p += _status.morePromotions[i].progress;
			pm += _status.morePromotions[i].max;
		}
		chrome.notifications.create('completeNotification', {
			type: 'basic',
			title: p.toString() + '/' + pm.toString(),
			message: 'All available promotion quests have been completed! \n\nMore could be on the way, and I will let you know.',
			iconUrl: 'img/done@8x.png',
			buttons: [{ title: 'Go To Microsoft Reward' }, { title: 'Dismiss' }]
		});
	}
	if (_questingStatus.searchQuesting == STATUS_DONE && _questingStatus.sendSearchCompletionNotification) {
		_questingStatus.sendSearchCompletionNotification = false;
		chrome.notifications.create('searchQuestCompletionNotification',{
            type: 'basic',
            title: (_status.pcSearch.progress + _status.mbSearch.progress).toString() + '/' + (_status.pcSearch.max + _status.mbSearch.max).toString(),
            message: 'Search quests have been completed!',
            iconUrl: 'img/done@8x.png',
            buttons: [{ title: 'Go To Microsoft Reward' }, { title: 'Dismiss' }]
        })
	}
}

function setBadge(status) {
	if (status == STATUS_BUSY) {
		chrome.browserAction.setIcon({path:"img/busy@1.5x.png"});
		chrome.browserAction.setBadgeText({text: ''});
		console.log('busy badge')
	} else if (status == STATUS_DONE) {
		chrome.browserAction.setIcon({path:"img/done@1.5x.png"});
		chrome.browserAction.setBadgeText({text: ''});
		console.log('done badge')
	} else if (status == STATUS_WARNING) {
		chrome.browserAction.setIcon({path:"img/err@1.5x.png"});
		chrome.browserAction.setBadgeText({text: (_status.dailyPoint.max - _status.dailyPoint.progress).toString()});
		chrome.browserAction.setBadgeBackgroundColor({"color": [225, 185, 0, 100]}); 
		console.log('warning badge')
	} else if (status == STATUS_ERROR) {
		chrome.browserAction.setIcon({path:"img/err@1.5x.png"});
		chrome.browserAction.setBadgeText({text: 'err'});
		chrome.browserAction.setBadgeBackgroundColor({"color": [225, 185, 0, 100]}); 
		console.log('error badge')
	} else {		
		chrome.browserAction.setIcon({path:"img/bingRwLogo@1.5x.png"});
		chrome.browserAction.setBadgeText({text: ''});
		console.log('none badge')
	}
}

chrome.browserAction.onClicked.addListener(function (tab) {
	// send notification if it is initiated from browser action.
	_questingStatus.sendPromoCompletionNotification = true;
	_questingStatus.sendSearchCompletionNotification = true;
	checkQuests();
});

chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
		_questingStatus.sendPromoCompletionNotification = true;
		_questingStatus.sendSearchCompletionNotification = true;
        checkQuests();
    }
});

chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
	if (notificationId == 'usedAllGoogleTrendPageNotification')	{ 
		// this notification has no button
		// failStatusCheckNotification
	} else if (notificationId == 'unfinishedPromotionNotification' && buttonIndex == 0) {
		// for notificationIds:
		// unfinishedPromotionNotification
		chrome.tabs.create({
			url: 'https://www.bing.com/',
			active: true});
	} else if (buttonIndex == 0) {		
		// notLoggedInNotification	
		// searchQuestCompletionNotification	
		// completeNotification
		chrome.tabs.create({
			url: 'https://account.microsoft.com/rewards',
			active: true});
	} else {
		chrome.notifications.clear(notificationId);
	}
});

checkQuests();
// and then check every 30 minutes for possible new promotion
var _mainTimer = setInterval(
	function() {
		checkQuests();
	},
	3600000
);