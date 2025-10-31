export namespace analyzer {
	
	export class AnalysisConfig {
	    stabilityThreshold: number;
	    turnTolerance: number;
	    minStableLen: number;
	    maxOutliers: number;
	    sumTolerance: number;
	
	    static createFrom(source: any = {}) {
	        return new AnalysisConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.stabilityThreshold = source["stabilityThreshold"];
	        this.turnTolerance = source["turnTolerance"];
	        this.minStableLen = source["minStableLen"];
	        this.maxOutliers = source["maxOutliers"];
	        this.sumTolerance = source["sumTolerance"];
	    }
	}

}

export namespace desktop {
	
	export class SegmentInfo {
	    startIndex: number;
	    endIndex: number;
	    avgAngle: number;
	    length: number;
	
	    static createFrom(source: any = {}) {
	        return new SegmentInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startIndex = source["startIndex"];
	        this.endIndex = source["endIndex"];
	        this.avgAngle = source["avgAngle"];
	        this.length = source["length"];
	    }
	}
	export class TurnInfo {
	    startAngle: number;
	    endAngle: number;
	    diff: number;
	    signedDiff: number;
	    isClockwise: boolean;
	    startIndex: number;
	    endIndex: number;
	
	    static createFrom(source: any = {}) {
	        return new TurnInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startAngle = source["startAngle"];
	        this.endAngle = source["endAngle"];
	        this.diff = source["diff"];
	        this.signedDiff = source["signedDiff"];
	        this.isClockwise = source["isClockwise"];
	        this.startIndex = source["startIndex"];
	        this.endIndex = source["endIndex"];
	    }
	}
	export class AnalysisResponse {
	    success: boolean;
	    isValid: boolean;
	    compass: string;
	    deviceType: string;
	    turns: TurnInfo[];
	    allAngles: number[];
	    segments: SegmentInfo[];
	    errors?: string[];
	    log?: string;
	
	    static createFrom(source: any = {}) {
	        return new AnalysisResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.isValid = source["isValid"];
	        this.compass = source["compass"];
	        this.deviceType = source["deviceType"];
	        this.turns = this.convertValues(source["turns"], TurnInfo);
	        this.allAngles = source["allAngles"];
	        this.segments = this.convertValues(source["segments"], SegmentInfo);
	        this.errors = source["errors"];
	        this.log = source["log"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HistoryItem {
	    id: string;
	    timestamp: number;
	    compass: string;
	    deviceType: string;
	    isValid: boolean;
	    turnsCount: number;
	    anglesCount: number;
	    fullData: string;
	
	    static createFrom(source: any = {}) {
	        return new HistoryItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.timestamp = source["timestamp"];
	        this.compass = source["compass"];
	        this.deviceType = source["deviceType"];
	        this.isValid = source["isValid"];
	        this.turnsCount = source["turnsCount"];
	        this.anglesCount = source["anglesCount"];
	        this.fullData = source["fullData"];
	    }
	}
	export class RenameResult {
	    oldName: string;
	    newName: string;
	    success: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new RenameResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.oldName = source["oldName"];
	        this.newName = source["newName"];
	        this.success = source["success"];
	        this.error = source["error"];
	    }
	}
	export class RenameStats {
	    total: number;
	    success: number;
	    failed: number;
	    results: RenameResult[];
	    directory: string;
	
	    static createFrom(source: any = {}) {
	        return new RenameStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total = source["total"];
	        this.success = source["success"];
	        this.failed = source["failed"];
	        this.results = this.convertValues(source["results"], RenameResult);
	        this.directory = source["directory"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

