var portalLib = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var thymeleaf = require('/lib/xp/thymeleaf'); 
var syllable = require('/lib/syllable');
var cacheLib = require('/lib/cache');


var fleschKincaidBean = __.newBean('com.kennycason.fleschkincaid.FleschKincaid');
var pluralize = require('/lib/pluralize');

var cache = cacheLib.newCache({
	size: 100,
	expire: 3600
});

var CL_LETTER_WEIGHT = 0.0588;
var CL_SENTENCE_WEIGHT = 0.296;
var CL_BASE = 15.8;
var CL_PERCENTAGE = 100;

var SPACHE_SENTENCE_WEIGHT = 0.121;
var SPACHE_WORD_WEIGHT = 0.082;
var SPACHE_PERCENTAGE = 100;
var SPACHE_BASE = 0.659;

var itemLengthText = function(item){
	return (item.length > 25) ? true : false;
}

var fleschKincaidCompute = function(text){
	return __.toNativeObject(fleschKincaidBean.calculate(text));
}

function colemanLiauCompute(counts) {
  if (!counts || !counts.sentence || !counts.word || !counts.letter) {
    return NaN;
  }

  return (CL_LETTER_WEIGHT * (counts.letter / counts.word * CL_PERCENTAGE)) -
    (CL_SENTENCE_WEIGHT * (counts.sentence / counts.word * CL_PERCENTAGE)) -
    CL_BASE;
}

function spacheCompute(counts) {
	if (!counts || !counts.sentence || !counts.word) {
    	return NaN;
  	}

  	return SPACHE_BASE +
    	(SPACHE_SENTENCE_WEIGHT * counts.word / counts.sentence) +
    	(SPACHE_WORD_WEIGHT * (counts.unfamiliarWord || 0) / counts.word * SPACHE_PERCENTAGE);
}

var sentenceLexer = function(sentence){
    //log.error('sentenceLexer');
    var results = {};
    var wordSyllableList = [];
    var words = sentence.split(' ');

    var redFlagSentence = {};
    var redFlagWords = [];
    var isRedFlagSentence = 0;

    // TBD, profile this :
    var sentenceSyllableCount = syllablesInText(sentence);
    if (sentenceSyllableCount > 20){
        redFlagSentence.sentence = sentence;
        redFlagSentence.syllableCount = sentenceSyllableCount;
        isRedFlagSentence = 1;
        redFlagSentence.isRedFlagSentence = isRedFlagSentence;
    }

    words.forEach(function(word, idx){
        var wordSyllableCount = syllablesInText(word);
        wordSyllableList.push(wordSyllableCount);
        if (wordSyllableCount > 4){
            var redFlagWord = {
                word : word,
                syllableCount : wordSyllableCount
            }
            redFlagWords.push(redFlagWord);
        }
    });

    results.redFlagSentence = redFlagSentence;
    results.redFlagWords = redFlagWords;
    results.isRedFlagSentence = isRedFlagSentence;
    return results;
}


var textLexer = function(text){
    //log.error('textLexer');
    var results = {};
	var sentenceList = text.split('.');

	if (sentenceList.length > 1) {
        sentenceList.pop();
	}

    var redFlagSentences = [];
    var redFlagWords = [];
    var redFlagSentenceCount = 0;

    sentenceList.forEach(function(sentence, idx){

        var words = sentence.split(' ');
        var sentenceResult = sentenceLexer(sentence, words);
        if (sentenceResult.isRedFlagSentence == 1){
        	redFlagSentenceCount += 1;
        }
        redFlagSentences.push(sentenceResult.redFlagSentence);
        redFlagWords = redFlagWords.concat(sentenceResult.redFlagWords);

    });

    results.redFlagSentences = redFlagSentences;
    results.redFlagWords = redFlagWords;
    results.redFlagSentenceCount = redFlagSentenceCount;
    results.redFlagWordCount = redFlagWords.length;

    var wordList = [];
    redFlagWords.forEach(function(word,idx){
        wordList.push(word.word);
    });

    results.wordList = wordList.toString();

    return results;
}

var textPreProcessing = function(text){
	var wordCount;
	var letterCount;
	var syllableCount;
	var results = {};
    var sentenceCount;

	wordCount = text.split(' ').length;

	var splitText = text.split('.');
	if (splitText.length > 1){
		sentenceCount = splitText.length - 1;
	} else {
		sentenceCount = 1;
	}
	// sentenceCount = text.split('.').length - 1;

	letterCount = text.replace(/[^A-Z]/gi, "").length;
    syllableCount = syllablesInText(text);

	results.sentence = sentenceCount;
	results.word = wordCount;
	results.letter = letterCount;
	results.syllableCount = syllableCount;

	return results
}

var syllablesInText = function(text){
	return syllable(text);
}

var colemanLiauAnalysis = function(text){
	var parseResults = textPreProcessing(text);
	var colemanLiauScore = colemanLiauCompute(parseResults);
	return colemanLiauScore;
}

var spacheAnalysis = function(text){
	//log.error('spacheAnalysis');
	var parseResults = textPreProcessing(text);
	var spacheScore = spacheCompute(parseResults);

	var results = {
	    spacheScore : spacheScore,
        syllableCount: parseResults.syllableCount

    }
	return spacheScore;
}

var between = function(x, min, max) {
  return x >= min && x <= max;
}
	
var weightColemanLiau = function(rawScore, max){
	return (10 * (1 - (rawScore / max)));
}

var colemanLiauNormalizedScore = function(clRawScore){
	var normCLScore;
	if(between(clRawScore, 0, 6)){
		normCLScore = 90 + weightColemanLiau(clRawScore, 6);
	} else if(between(clRawScore,6,7)){
		normCLScore = 80 + weightColemanLiau(clRawScore, 7);
	} else if(between(clRawScore,7,8)){
		normCLScore = 70 + weightColemanLiau(clRawScore, 8);
	} else if(between(clRawScore,8,10)){
		normCLScore = 60 + weightColemanLiau(clRawScore, 10);
	} else if(between(clRawScore,10,13)){
		normCLScore = 50 + weightColemanLiau(clRawScore, 13);
	} else if(between(clRawScore,13,17)){
		normCLScore = 30 + weightColemanLiau(clRawScore, 17);
	} else {
		normCLScore = 0 + weightColemanLiau(clRawScore,18);
	}
	return normCLScore;
}

var numberToLetterScore = function(numberScore){
	var letterScore;
	if (between(numberScore, 82, 100)){
		letterScore =  "A";
	} else if (between(numberScore, 64, 82)) {
		letterScore = "B";
	} else if (between(numberScore, 46, 64)) {
		letterScore = "C";
	} else if (between(numberScore, 30, 46)) {
		letterScore = "D";
	}  else {
		letterScore = "F";	
	}
	return letterScore;
}

var summarizedScore = function(scores){
	// log.error('summarizedScore');
	var fkScore = scores.fleschKincaidScore;
	var clScore = colemanLiauNormalizedScore(scores.colemanLiauScore);

	var avgScore = (fkScore + clScore) / 2;
	scores = {
		numberScore: avgScore,
		letterScore: numberToLetterScore(avgScore)
	}

	return scores;
}

var stripHtmlFromText = function(textWithHtml){
	// TBD : complete
	var cleanedText = textWithHtml;
	cleanedText = cleanedText.replace('<p>','');
	cleanedText = cleanedText.replace('</p>','');
	return cleanedText;
}

var textFromPageRegion = function(pageItem){
	// log.error('textFromPageRegion');
	var componentTextList = [];

	try {
		var components = pageItem.page.regions.main.components;
		components.forEach(function(component, idx){
			if (component.type == "text" && component.text != ""){
				var siteText = stripHtmlFromText(component.text);
				componentTextList.push(siteText);	
			}	
		});
	} catch(err) {
		// log.error(err);
	}
	return componentTextList;
}

var analysisFromText = function(textItem){
	//log.error('analysisFromText');
	var fleschKincaidScore;
	var colemanLiauScore;
	var spacheScore;
	var syllableScore;
	var lexerResults;
	var testResult;	
	var sumScores;

	testResult = itemLengthText(textItem);

	if (testResult){
		fleschKincaidScore = fleschKincaidCompute(textItem);
		colemanLiauScore = colemanLiauAnalysis(textItem);
		spacheScore = spacheAnalysis(textItem);
		syllableScore = syllablesInText(textItem);
		lexerResults = textLexer(textItem);

		var scores = {
			fleschKincaidScore: fleschKincaidScore,
			colemanLiauScore: colemanLiauScore,
		}
		sumScores = summarizedScore(scores);

	} else {
		fleschKincaidScore = 0;
		colemanLiauScore = 0;
		spacheScore = 0;
		syllableScore = 0;
		lexerResults = {
			redFlagSentenceCount : 0,
			redFlagWordCount : 0
		}
		sumScores = {
			numberScore:0,
			letterScore:"N/A"
		}
	}

	var result = {
		testResult : testResult,
		fleschKincaidScore : fleschKincaidScore,
		colemanLiauScore : colemanLiauScore,
		spacheScore : spacheScore,
		syllableScore : syllableScore,
		lexerResults : lexerResults,
		sumScores : sumScores			
	}

	return result;
}

var analysisFromPageObject = function(pageItem){
	//log.error('analysisFromPageObject');
	var dataType = pageItem.type;
	var dataName = pageItem._name;
	var contentObj = pageItem.data;
	var results = [];

	try {
		var props;
		props = Object.getOwnPropertyNames(contentObj);
		props.forEach(function(val, idx, array){
			var itemName = val;
			var itemContent = contentObj[val];
			var textAnalysisResult = analysisFromText(itemContent);

			var testResult = textAnalysisResult.testResult;
			var fleschKincaidScore = textAnalysisResult.fleschKincaidScore;
			var colemanLiauScore = textAnalysisResult.colemanLiauScore;
			var spacheScore = textAnalysisResult.spacheScore;
			var syllableScore = textAnalysisResult.syllableScore;
			var lexerResults = textAnalysisResult.lexerResults;
			var sumScores = textAnalysisResult.sumScores;

			// TBD : refactor
			results.push([itemName, testResult, fleschKincaidScore, colemanLiauScore, spacheScore, sumScores,syllableScore,lexerResults, dataType, dataName, itemContent]);
		});
	} catch(err){
		log.error(err);
	}

	// handle text in page regions
	var regionTextList = textFromPageRegion(pageItem);
	if (regionTextList.length > 0){
		regionTextList.forEach(function(regionTextItem, idx){
			var itemName = "regionTextComponent";
			var itemContent = regionTextItem;
			var textAnalysisResult = analysisFromText(itemContent);

			var testResult = textAnalysisResult.testResult;
			var fleschKincaidScore = textAnalysisResult.fleschKincaidScore;
			var colemanLiauScore = textAnalysisResult.colemanLiauScore;
			var spacheScore = textAnalysisResult.spacheScore;
			var syllableScore = textAnalysisResult.syllableScore;
			var lexerResults = textAnalysisResult.lexerResults;
			var sumScores = textAnalysisResult.sumScores;
			// TBD : refactor
			results.push([itemName, testResult, fleschKincaidScore, colemanLiauScore, spacheScore, sumScores,syllableScore,lexerResults, dataType, dataName, itemContent]);
		})
	}
	return results;
}

function isEdge(req) {
    var ua = req.headers['User-Agent'] || '';
    return ua.indexOf('Edge') >= 0;
}

var readResultsAssemblyFromList = function(analysisResultList){
	//log.error('readResultsAssemblyFromList');
	var readScoreList = [];
	analysisResultList.forEach(function(analysisResult,idx){
		var readResult = readResultsAssembly(analysisResult);		
		var propNames = Object.getOwnPropertyNames(readResult);
		readScoreList.push(readResult);
	});
	return readScoreList;
}


var readResultsAssembly = function(analysisResults){
	var resultCount = 0;
	var readScores = [];

	analysisResults.forEach(function(val){
		resultCount += 1;
		var readResult = {};
		readResult.fieldName = val[0];
		readResult.isText = val[1];
		readResult.fleschKincaidScore= val[2];
		readResult.colemanLiauScore = val[3];
		readResult.spacheScore = val[4];
		readResult.numberScore = val[5].numberScore;
		readResult.letterScore = val[5].letterScore;
		readResult.syllableScore = val[6];
		readResult.lexerResults = val[7];
		readResult.dataType = val[8];
		readResult.dataName = val[9];
		readResult.fullText = val[10];
		readResult.resultCount = toInteger(resultCount);
		readScores.push(readResult);
	})

	return readScores;
}

function toInteger(number){ 
  return Math.round( 
    Number(number)  
  ); 
};

var handleCache = function(){
//	tbd 
};

var getChildren = function(pageItem, treeList, nameList, pageResults){
	//log.error('getChildren');
	if (pageItem.hasChildren != true || pageItem._name.startsWith("_")){
		return 0;
	}
	var rootId = pageItem._id;

	var children = contentLib.getChildren({
		key: rootId,
		branch: 'draft' 
	});

	children.hits.forEach(function(child,idx){
		if (!child._name.startsWith("_")){

			treeList.push(child._id);
			nameList.push(child._name);
			var pageResult = analysisFromPageObject(child);
			pageResults.push(pageResult);
			getChildren(child, treeList, nameList, pageResults);
		}
			
	});

	var readScoreList = readResultsAssemblyFromList(pageResults);
	return readScoreList;
}


var handleTreeLookup = function(pageItem){

	var pageResults = [];

	var treeList = [];
	var nameList = [];
	var readScoreList = [];

	if (!pageItem._name.startsWith("_")){
		var pageResult = analysisFromPageObject(pageItem);

		pageResults.push(pageResult);
		nameList.push(pageItem._name);
		treeList.push(pageItem._id);

		if (pageItem.hasChildren == true){
			readScoreList = getChildren(pageItem, treeList, nameList, pageResults);
		} else {
			var analysisResult = analysisFromPageObject(pageItem);
			readScoreList = readResultsAssembly(analysisResult);
		}
	}

	return readScoreList;
}

var flattenList = function(list){
	return [].concat.apply([], list);	
}

var sumList = function(list){
	var sum = 0;
	list.forEach(function(item,idx){
		sum += item;
	});

	return sum;
}

var averageOfList = function(list){
	return sumList(list) / list.length;
}

var aggregateScore = function(list){
	var scoreList = [];
	var result = {
		numberScore : 0,
		letterScore : "N/A"
	}

	list.forEach(function(item, idx){
		if (item.numberScore != 0) scoreList.push(item.numberScore);
	});

	if (scoreList.length == 0){
		return result;
	}		

	result.numberScore = averageOfList(scoreList);
	result.letterScore = numberToLetterScore(result.numberScore);

	return result;
}

exports.get = function (req) {
	var activeBranch = 'draft';
	var uid = req.params.uid;
	var contentId = req.params.contentId;

	// var dateStart = new Date();
	// var timeStart = dateStart.getTime();

	if (!contentId) {
		contentId = portalLib.getContent()._id;
	}

	var contentDataDraft = contentLib.get({key: contentId, branch: 'draft'});
	var contentDataMaster = contentLib.get({key: contentId, branch: 'master'});

	var readScoresDraftList = handleTreeLookup(contentDataDraft);
	var readScoresMasterList= handleTreeLookup(contentDataMaster);

	// TBD - possibly unflatten
	var readScoresDraftListFlattened = flattenList(readScoresDraftList);
	var readScoresMasterListFlattened = flattenList(readScoresMasterList);

	var agScoreDraft = aggregateScore(readScoresDraftListFlattened);
	var agScoreMaster = aggregateScore(readScoresMasterListFlattened);

	var model = {
		uid: uid,
		css: isEdge(req) ? css : null,
		agScoreDraft: agScoreDraft,
		agScoreMaster: agScoreMaster,
		contentDraft: readScoresDraftListFlattened,
		contentMaster: readScoresMasterListFlattened,
		showMaster: activeBranch === 'master',
		showDraft: activeBranch === 'draft'
	}

	// var dateStop = new Date();
	// var timeStop = dateStop.getTime();
	// var timeDiff = timeStop - timeStart;

	// log.error("time start : " + timeStart);
	// log.error("time stop  : " + timeStop);
	// log.error("elapsed    : " + timeDiff);

	var view = resolve('readable.html');
	return {
	    	body : thymeleaf.render(view, model),
	        contentType: 'text/html'
	}
};
