/**
 * 入口文件
 */

const helper = require('./helper');
const playFileList = require('./config/playFileList')();
const downloadHandle = require('./downloadHandle');
const openLiveHandle = require('./openLiveHandle');
const videoHandle = require('./videoHandle');
const del = require('del');
const fs = require('fs');
const logger = require('./logger');

var globalLiveInfo = null;

logger.info('启动');

//1.读取上次章节播放
var chapter = helper.getLastChapter();
if(!chapter){
	//如果没有，设置playFileList中的第一个为播放文件
	chapter = playFileList[0];
	chapter.chapter = playFileList[0].title;
	chapter.section = playFileList[0].section[0];
	helper.setLastChapter(chapter);
}

function loopLogic(currentChapter) {
	return Promise.all([
		videoHandle.pushStream(currentChapter,globalLiveInfo),
		new Promise((reslove,reject) => {
			let nextChapter = helper.getNextChapter(currentChapter.chapter,currentChapter.section);
			return downloadHandle.downloadByCS(nextChapter.chapter,nextChapter.section).then(() =>{
				helper.setLastChapter(nextChapter);
				reslove(nextChapter);
			});
		})
	]).then(([unuseful,nextChapter]) => {
		del([`${__dirname}/data/${chapter.section}`]);
		chapter = nextChapter;
		return loopLogic(nextChapter);
	}).catch(function(err){
		logger.error("遇到异常，中断进程");
		logger.error(err);
		process.exit();
	});
}
//2.根据读取到的章节去百度云盘上去数据
openLiveHandle.startLiveAndGetInfo().then((liveInfo) => {
	globalLiveInfo = liveInfo;
	return fs.existsSync(`./data/${chapter.section}`) ;
}).then((haveDownLoadFile) =>{
	if(!haveDownLoadFile)	return downloadHandle.downloadByCS(chapter.chapter,chapter.section);
	return;
}).then(() => {
	logger.info('开始直播！！！');
	return loopLogic(chapter);
}).catch(function (err){
	logger.error(err);
});