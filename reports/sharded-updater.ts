// Goal:  Build three a shard updating thing, using caching 

function areaShardUpdater1() {
    updateShard("Area");
}

function districtShardUpdater1() {
    updateShard("District");
}

function zoneShardUpdater1() {
    updateShard("Zone");
}
function areaShardUpdater2() {
    updateShard("Area");
}

function districtShardUpdater2() {
    updateShard("District");
}

function zoneShardUpdater2() {
    updateShard("Zone");
}

// function updateShard1_Area() {
//     let scope = "Area";
//     let targetShard = "1";
//     let runner_args = {
//         trigger: triggerTypes.DEBUG,
//         functionArg: targetShard.toString(),
//         ignoreLockout: true,
//         shardNumber: targetShard.toString(),
//     };
//     meta_runner(updateAreaReportsV5, runner_args);
// }

function getSmallestGroup(shardKeys: manyShardEntries): manyShardEntries {
    let smallest: number = Number.MAX_SAFE_INTEGER;
    let smallestSet: manyShardEntries = {};
    for (let key in shardKeys) {
        if (Object.prototype.hasOwnProperty.call(shardKeys, key)) { // codefactor.io suggestion


            let keyValue: shardEntry = shardKeys[key];
            let updateTime: number = keyValue.lastUpdate;
            if (updateTime == smallest) {
                smallestSet[key] = keyValue;
            }
            if (updateTime < smallest) {
                smallest = updateTime;
                smallestSet = {};
                smallestSet[key] = keyValue;
            }
        }
    }
    return smallestSet;

}

interface manyShardEntries {
    [index: string]: shardEntry;
}

function updateShard(scope: filesystemEntry["fsScope"]) {
    // this implementation is somewhat dumb and essentially requires things to take more than a minute to update to hit shards further down the line.

    let scopeFunctionTargets = {
        "Zone": updateZoneReportsV5,
        "District": updateDistrictReportsV5,
        "Area": updateAreaReportsV5
    };

    let shardLockArgs: shardLockV2Args = {
        enableConcurrentUpdates: false
    };
    let shardLocker = new shardLockV2(scope);

    let targetShard: string | null = shardLocker.pickShardToUpdate();
    if (targetShard == null) {
        console.info("Exiting: Nothing to Update!");
        return;
    }
    shardLocker.updateShard(targetShard, true);
    let runner_args: meta_runner_args = {
        trigger: triggerTypes.timeBased,
        functionArg: targetShard,
        ignoreLockout: true,
        shardNumber: targetShard,
        shardScope: scope,
        preLogData: JSON.stringify(shardLocker.cacheData)
    };

    meta_runner(scopeFunctionTargets[scope], runner_args);
    shardLocker.updateShard(targetShard, false);


}

// No longer needed.
// function turnArrayToString(array) {
//     let outString = "[";
//     for (let i in array) {
//         let entry = array[i];
//         if (entry.constructor.name == "Array") {
//             outString += turnArrayToString(entry);

//         } else {
//             outString += entry;
//         }
//         // formatting: if not the last entry in a stack, append a comma.
//         if (+i != array.length - 1) { outString += ", "; }
//     }
//     outString += "]";
//     return outString;
// }

function testShardLock() {
    let args: shardLockV2Args = {
        enableConcurrentUpdates: false
    };
    let shardLocker = new shardLockV2("District", args);
    shardLocker.testShardUpdating();
}




type shardLockCache = {
    [index in filesystemEntry["fsScope"]]: shardSet
};
interface shardSet {
    [index: string]: shardEntry;
}

interface shardEntry {
    active: boolean,
    lastUpdate: number,
}


function createShardValues(): shardLockCache {
    let maxShards = INTERNAL_CONFIG.fileSystem.shardManager.number_of_shards;
    let output: shardLockCache = {
        "Zone": {}, "District": {}, "Area": {},
    };
    for (let scope of ["Zone", "District", "Area"]) {
        output[scope] = {};
        for (let i = 1; i <= maxShards; i++) {
            let entry: shardEntry = {
                active: false,
                lastUpdate: 0
            };
            output[scope][i.toString()] = entry;
        }

    }
    return output;
}
/**
 * Takes the output from JSON.parse'ing the cache and verifies that it matches the shardLockCache interface.
 *
 * @param {*} cacheOutput
 * @return {*}  {shardLockCache}
 */
function updateCache(cacheOutput): shardLockCache {
    let scopes = ["Zone", "District", "Area"];
    let testScope: string = scopes[Math.floor(Math.random() * scopes.length)];
    let testShard: string = Math.floor(Math.random() * INTERNAL_CONFIG.fileSystem.shardManager.number_of_shards).toString();

    try {

        for (let scope in cacheOutput) {
            if (Object.prototype.hasOwnProperty.call(cacheOutput, scope)) {// codefactor.io suggestion
                for (let shard in cacheOutput[scope]) {
                    if (Object.prototype.hasOwnProperty.call(cacheOutput[scope], shard)) { // codefactor.io suggestion
                        cacheOutput[scope][shard].lastUpdate = + cacheOutput[scope][shard].lastUpdate;
                        cacheOutput[scope][shard].active = Boolean(cacheOutput[scope][shard].active);
                    }
                }
            }
        }
        return cacheOutput;


    } catch (error) {
        console.warn(cacheOutput);
        console.error(error);
        return createShardValues();
    }
}
function loadShardCache() {
    let cache = CacheService.getScriptCache();
    let cacheValues = cache.get(INTERNAL_CONFIG.fileSystem.shardManager.shard_cache_base_key);
    if (cacheValues == null || cacheValues == "" || typeof cacheValues == undefined) {
        var cacheOutput = createShardValues();
    } else {
        var cacheOutput: shardLockCache = updateCache(JSON.parse(cacheValues));
    }
    console.log(cacheOutput);
    return cacheOutput;
}





function clearShardCache() {
    let cache = CacheService.getScriptCache();
    cache.remove(INTERNAL_CONFIG.fileSystem.shardManager.shard_cache_base_key);
}

function setShardCache(shardCacheObject: shardLockCache) {
    let cacheValue = JSON.stringify(shardCacheObject);
    let cache = CacheService.getScriptCache();
    cache.put(INTERNAL_CONFIG.fileSystem.shardManager.shard_cache_base_key, cacheValue);
}


/**
 * Written for shardlockV2: Responsible for enforcing type & structure on values retrieved from the cache.
 *
 * @param {string} cacheVal
 * @return {*}  {shardEntry}
 */
function parseCacheLockValue(cacheVal: string | null): shardEntry {
    let output: shardEntry = {
        active: false,
        lastUpdate: 0,
    };
    if (cacheVal != null) { // used, until T4_R6, falsy characteristics: if null or "", we'll return the default number
        let deString = JSON.parse(cacheVal);
        try {
            output.active = deString["active"];
            output.lastUpdate = deString["lastUpdate"];
        } catch (error) {
            console.warn("Error parsing cache:", error);
        }
    }
    return output;
}
interface shardLockV2Args {
    enableConcurrentUpdates: boolean;
}
// PER-SCOPE.
class shardLockV2 {
    numberOfShards: number = INTERNAL_CONFIG.fileSystem.shardManager.number_of_shards;
    shard_prefix: "SHARDLOCK2_";
    scopes = ["Zone", "District", "Area"];
    currentScope = "";
    concurrent_updates: boolean = false;

    constructor(targetScope: filesystemEntry["fsScope"], args: shardLockV2Args = { enableConcurrentUpdates: false }) {
        this.currentScope = targetScope;
        this.concurrent_updates = args.enableConcurrentUpdates;


    }
    get cacheData(): shardSet {
        let cache = CacheService.getScriptCache();
        let shardData: shardSet = {};

        for (let i = 1; i <= this.numberOfShards; i++) {
            if (this.currentScope) {
                let cacheKey: string = this.shard_prefix + i.toString();
                let cacheVal: string = cache.get(cacheKey);
                let cacheData: shardEntry = parseCacheLockValue(cacheVal);
                shardData[i.toString()] = cacheData;

            } else {
                throw "ShardLock not initialized properly!";
            }
        }

        return shardData;
    }

    updateShard(shardNumber: string, value: boolean): this {
        let cache = CacheService.getScriptCache();
        let cacheKey = this.shard_prefix + shardNumber;
        let updateTime = new Date().getTime();
        let cacheData: shardEntry = {
            active: value,
            lastUpdate: updateTime
        };
        let cacheValue = JSON.stringify(cacheData);
        console.warn(cacheValue);
        cache.put(cacheKey, cacheValue, INTERNAL_CONFIG.fileSystem.shardManager.timeout_in_seconds );
        return this;
    }

    testShardUpdating() {
        let cache_mod: shardSet = this.cacheData;
        let targetShard: string = "2";
        let shardPre: shardEntry = cache_mod[targetShard];
        shardPre.active = !shardPre.active;
        shardPre.lastUpdate += 200;
        let cache_pre: shardSet = this.cacheData;
        this.updateShard(targetShard, shardPre.active);

        let cache_post: shardSet = this.cacheData;
        if (cache_pre[targetShard].lastUpdate == cache_post[targetShard].lastUpdate) {
            throw "🔥 Cache Update Test FAILED!";
        } else {
            console.info("✅Cache Update Passed!");
        }
    }

    pickShardToUpdate(): string | null {
        let cacheData = this.cacheData;

        // BASIC: Return a random number.  Fallback in case logic fails or something.
        let returnVal: string | null = null;
        // returnVal = (Math.floor(Math.random() * this.numberOfShards) + 1).toString();

        // Step One: Checks to see if any aren't being updated.
        let availableShards: manyShardEntries = {};
        let allShards: manyShardEntries = {};
        for (let i = 1; i <= this.numberOfShards; i++) {
            if (cacheData[i.toString()].active == false) {
                availableShards[i.toString()] = cacheData[i.toString()];
            }
            allShards[i.toString()] = cacheData[i.toString()];
        }

        // Step Two: Get the group of entries updated least recently.
        // Has a possibility of being none or multiple, depending on whether or not the cache gets cleared.

        let smallestValue: number = Number.MAX_SAFE_INTEGER;
        let smallestSet: manyShardEntries = getSmallestGroup(availableShards);

        // Step Two-1/2: If there's not zero values in the smallestSet set, update one of them randomly.
        let smallestSetKeys: string[] = Object.keys(smallestSet);
        let smallestSetSize: number = smallestSetKeys.length;
        if (smallestSetSize >= 1) {
            returnVal = smallestSetKeys[Math.floor(Math.random() * smallestSetSize)];
            return returnVal;

        }

        // Step Three: If Concurrent Updates are disabled, return null.  Otherwise, return the least-recently-updated value.
        if (this.concurrent_updates == false) {
            return null;
        } else {
            // Step Four: Pick the oldest to update.
            let smallestSet: manyShardEntries = getSmallestGroup(allShards);
            let smallestSetKeys: string[] = Object.keys(smallestSet);
            let smallestSetSize: number = smallestSetKeys.length;
            if (smallestSetSize >= 1) {
                returnVal = smallestSetKeys[Math.floor(Math.random() * smallestSetSize)];
                return returnVal;

            } else {
                console.warn("Honestly, not sure how you got here.  End of the line, kiddo!");
                return null;
            }




        }
        // This is deemed unreachable.  Sweet!
        return returnVal;
    }



}




