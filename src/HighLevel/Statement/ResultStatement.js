import { setAsUri } from "./helper.js";
import { ALL } from "./Ids/Profiles/Generated/All.js";
import { STATEMENT } from "./Ids/Statements.js";

/**
 * The Result Class of a Statement
 */
export default class ResultStatement {
    /**
     * Constructor of the ResultStatement class
     * 
     * @param {string} defaultURI The default URI for the extensions
     */
    constructor(defaultURI) {
        this.defaultURI = defaultURI;
        this.Score = null;
        this.Success = null;
        this.Completion = null;
        this.Response = null;
        this.Duration = null;
        this.Extensions = {};
    }

    /**
     * The ID of the Result
     * 
     * @type {string}
     */
    defaultURI;

    /**
     * The Score of the Result
     * 
     * @type {Object}
     */
    Score;
    /**
     * The success status of the Result
     * 
     * @type {boolean}
     */
    Success;
    /**
     * The Completion status of the Result
     * 
     * @type {boolean}
     */
    Completion;
    /**
     * The response of the Result
     * 
     * @type {string}
     */
    Response;
    /**
     * The duration of the Result
     * 
     * @type {string}
     */
    Duration;
    /**
     * The Extensions of the Result
     * 
     * @type {Object}
     */
    Extensions;

    /**
     * Check if the result is empty or not
     * @returns {boolean}
     */
    isEmpty() {
        return (this.Score == null) && (this.Duration == null) && (this.Success == null) && (this.Completion == null) && (this.Response == null) && (Object.keys(this.Extensions).length == 0);
    }

    /**
     * Set extensions from list
     * @param {Object} extensions extension list
     */
    setExtensions(extensions) {
        for (var key in extensions) {
            this.setExtension(key,extensions[key]);
        }
    }

    /**
     * Set result extension for key value
     * @param {typeof ALL.RESULTEXTENSION[keyof typeof ALL.RESULTEXTENSION]|string} key the key of the extension
     * @param {*} value the value of the extension
     */
    setExtension(key, value) {
        switch (key.toLowerCase()) {
            case 'success': { this.Success = value; break; }
            case 'completion': { this.Completion = value; break; }
            case 'response': { this.Response = value; break; }
            case 'score': { this.Score = this.setScoreValue("raw", value); break; }
            case 'duration': { this.Duration = value; break; }
            default: { this.Extensions[key] = value; break; }
        }
    }

    /**
     * Set the score of the statement
     * @param {string} key the key for the score 
     * @param {number|string} value the score, a numeric string is accepted
     */
    setScoreValue(key, value) {
        // a score part that is not a number would serialize as null, so it is left out rather
        // than stored; an empty string is not one, since Number('') is 0
        const score = Number(value);
        if(STATEMENT.RESULT.SCORE.hasOwnProperty(key.toUpperCase()) && value !== '' && Number.isFinite(score)) {
            if(! this.Score) {
                this.Score = {};
            }
            this.Score[key] = score;
        }
    }

        /**
     * Set the score of the statement
     * @param {number} raw the raw score
     * @param {number} min the min score
     * @param {number} max the max score
     * @param {number} scaled the scaled score
     */
    setScore(raw, min, max, scaled) {
        // a score of exactly 0 is a legitimate score, so each part is checked against being
        // absent rather than against being truthy
        if (isGiven(raw)) {
            this.setScoreRaw(raw);
        }

        if (isGiven(min)) {
            this.setScoreMin(min);
        }

        if (isGiven(max)) {
            this.setScoreMax(max);
        }

        if (isGiven(scaled)) {
            this.setScoreScaled(scaled);
        }
    }

        /**
     * Set the raw score of the statement
     * @param {number} raw the raw score 
     */
    setScoreRaw(raw) {
        this.setScoreValue(STATEMENT.RESULT.SCORE.RAW, raw);
    }
    
    /**
     * Set the min score of the statement
     * @param {number} min the min score 
     */
    setScoreMin(min) {
        this.setScoreValue(STATEMENT.RESULT.SCORE.MIN, min);
    }

    /**
     * Set the max score of the statement
     * @param {number} max the max score 
     */
    setScoreMax(max) {
        this.setScoreValue(STATEMENT.RESULT.SCORE.MAX, max);
    }

    /**
     * Set the scaled score of the statement
     * @param {number} scaled the scaled score 
     */
    setScoreScaled(scaled) {
        this.setScoreValue(STATEMENT.RESULT.SCORE.SCALED, scaled);
    }

    /**
     * Set completion status of the statement
     * @param {boolean} value the completion status
     */
    setCompletion(value) {
        this.setExtension(STATEMENT.RESULT.COMPLETION, value);
    }

    /**
     * Set success status of the statement
     * @param {boolean} value the success status
     */
    setSuccess(value) {
        this.setExtension(STATEMENT.RESULT.SUCCESS, value);
    }

    /**
     * Set duration of the statement
     * @param {Date} init init date of statement
     * @param {Date} end end date of statement
     */
    setDuration(init, end) {
        const durationInMs = end.getTime()-init.getTime();
        const durationInSec = durationInMs / 1000;
        const seconds = durationInSec % 60;
        const minutes = Math.floor(durationInSec / 60) % 60;
        const hours = Math.floor(durationInSec / 3600) % 24;
        const days = Math.floor(durationInSec / 86400);

        // Construct the ISO 8601 duration string
        const isoDuration = `P${days}DT${hours}H${minutes}M${seconds}S`;
        this.setExtension(STATEMENT.RESULT.DURATION, isoDuration);
    }

    /**
     * Set response of the statement
     * @param {string} value the response
     */
    setResponse(value) {
        this.setExtension(STATEMENT.RESULT.RESPONSE, value);
    }

    /**
     * Set progress status of the statement
     * @param {number} value the progress status
     */
    setProgress(value) {
        this.setExtension(STATEMENT.RESULT.PROGRESS, value);
    }

    /**
     * Set result extension for key of the statement
     * @param {typeof ALL.RESULTEXTENSION[keyof typeof ALL.RESULTEXTENSION]|string} key the key of the extension
     * @param {string} value the value of the extension
     */
    setVar(key,value) {
        this.setExtension(key, value);
    }

    /**
     * convert to XAPI
     * 
     * @returns {Object}
     */
    toXAPI() {
        var ret = {};

        if (this.Success !== null) {
            ret.success = (this.Success) ? true : false;
        }

        if (this.Completion !== null) {
            ret.completion = (this.Completion) ? true : false;
        }

        if (this.Response) {
            ret.response = this.Response.toString();
        }

        if (this.Score !== null) {
            ret.score = this.Score;
        }

        if (this.Duration !== null) {
            ret.duration = this.Duration;
        }


        if (this.Extensions !== null && obsize(this.Extensions) > 0) {
            ret.extensions = this.Extensions;

            for (var key in this.Extensions) {
                if (key in ALL.RESULTEXTENSION) {
                    this.Extensions[ALL.RESULTEXTENSION[key]] = this.Extensions[key];
                    delete this.Extensions[key];
                } else {
                    var newuri= setAsUri(key, this.defaultURI);
                    this.Extensions[newuri] = this.Extensions[key];
                    if(newuri !== key) {
                        delete this.Extensions[key];
                    }
                }
            }
        }

        return ret;
    }

    /**
     * Create a ResultStatement from xAPI result object
     * @param {Object} xapiObj
     * @param {string} baseURI
     * @returns {ResultStatement}
     */
    static fromXAPI(xapiObj, baseURI) {
        if (!xapiObj) return new ResultStatement(baseURI);
        const result = new ResultStatement(baseURI);
        if ('score' in xapiObj) result.Score = xapiObj.score;
        if ('success' in xapiObj) result.Success = xapiObj.success;
        if ('completion' in xapiObj) result.Completion = xapiObj.completion;
        if ('response' in xapiObj) result.Response = xapiObj.response;
        if ('duration' in xapiObj) result.Duration = xapiObj.duration;
        if ('extensions' in xapiObj) result.setExtensions(xapiObj.extensions);
        return result;
    }
    /**
     * convert to CSV
     * 
     * @returns {String}
     */
    toCSV() {
        var success = (this.Success !== null) ? ',success,' + this.Success.toString() : '';
        var completion = (this.Completion !== null) ? ',completion,' + this.Completion.toString() : '';
        var response = '';
        if (this.Response) {
            let respStr = (typeof this.Response === 'string') ? this.Response : String(this.Response);
            response = ',response,' + respStr.replaceAll(',', '\\,');
        }
        var score = '';

        if (exists(this.Score)) {
            if (exists(this.Score.raw)) {
                score += ',score,' + this.Score.raw;
            }

            if (exists(this.Score.min)) {
                score += ',score_min,' + this.Score.min;
            }

            if (exists(this.Score.max)) {
                score += ',score_max,' + this.Score.max;
            }

            if (exists(this.Score.scaled)) {
                score += ',score_scaled,' + this.Score.scaled;
            }
        }

        var result = success + completion + response + score;

        if (this.Extensions !== null && obsize(this.Extensions) > 0) {
            for (var key in this.Extensions) {
                result += ',' + key.replaceAll(',', '\\,') + ',';
                if (this.Extensions[key] !== null) {
                    if (typeof this.Extensions[key] === 'number') {
                        result += this.Extensions[key];
                    } else if (typeof this.Extensions[key] === 'string') {
                        result += this.Extensions[key].replaceAll(',', '\\,');
                    } else if (typeof this.Extensions[key] === 'object') {
                        if (ismap(this.Extensions[key])) {
                            var smap = '';

                            for (var k in this.Extensions[key]) {
                                if (typeof this.Extensions[key][k] === 'number') {
                                    smap += k + '=' + this.Extensions[key][k] + '-';
                                } else {
                                    smap += k + '=' + this.Extensions[key][k].replaceAll(',', '\\,') + '-';
                                }
                            }

                            result += smap.slice(0,-1);
                        }
                    } else {
                        result += this.Extensions[key];
                    }
                }
            }
        }

        return result;
    }
}

/**
 * Get the size of the object
 * @param {Object} obj the object to get the size
 * @returns {number}
 */
var obsize = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }
    return size;
};

/**
 * Check if is map
 * @param {Object} obj the object to check
 * @returns {boolean}
 */
var ismap = function(obj) {
    for (var key in obj) {
        if (typeof obj[key] === 'object') {
            return false;
        }
    }
    return true;
};

/**
 * Check if exist
 * @param {Object} value the object to check
 * @returns {boolean}
 */
var exists = function(value) {
    return !(typeof value === 'undefined' || value === null);
};

/**
 * Check whether a value was given, so that 0 and the empty string count as given while an
 * absent part does not
 * @param {any} value the value to check
 * @returns {boolean}
 */
var isGiven = function(value) {
    return !(typeof value === 'undefined' || value === null);
};