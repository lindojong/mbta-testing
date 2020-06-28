const fetch = require('node-fetch')

// question 1

// retrieve data representing subway routes. print long form names
const fetchRoutes = async () => {
	let response = await fetch(`https://api-v3.mbta.com/routes?filter[type]=0,1`).then(response => response.json())
	let routes = response.data.map(line => line.attributes.long_name)
	console.log("List of all subway routes in long name form:")
	console.log(routes)
}

// question 2

// extend program to include the following:
// 1. The name of the subway route with the most stops as well as a count of its stops.
// 2. The name of the subway route with the fewest stops as well as a count of its stops.
// 3. A list of the stops that connect two or more subway routes along with the relevant route
// names for each of those stops.
const fetchRoutesConnections = async () => {
	let response = await fetch(`https://api-v3.mbta.com/routes?filter[type]=0,1`).then(response => response.json())
	let routes = response.data.map(line => { return { id: line.id, name: line.attributes.long_name } })
	let organizedStops = await Promise.all(
		routes.map(route =>
			fetch(`https://api-v3.mbta.com/stops?filter[route]=${route.id}`)
				.then(response => response.json())
				.then(response => { return { id: route.id, name: route.name, stops: response.data } })
				.catch(err => console.error(err))
		)
	)
	// sorts stop sets by least to most
	let sortedOrganizedStops = organizedStops.sort((a, b) => a.stops.length - b.stops.length)

	// print the subway route with the most stops and a count of its stops
	let maxStops = sortedOrganizedStops[sortedOrganizedStops.length - 1]
	console.log("Subway route with the most stops is " + maxStops.name + ": " + maxStops.stops.length)

	// print the subway route with the least stops and a count of its stops
	let minStops = sortedOrganizedStops[0]
	console.log("Subway route with the least stops is " + minStops.name + ": " + minStops.stops.length)

	// keep track of an array of unique stop ids and their route name
	// if an id comes up more than once, add the new route name
	// print all stops for which route names > 1
	let uniqueStops = []
	for (set of sortedOrganizedStops) {
		for (s of set.stops) {
			// if this is the very first entry for uniqueStops
			if (uniqueStops.length === 0) {
				let routeArray = [set.name]
				uniqueStops.push({ stopId: s.id, stopName: s.attributes.name, routes: routeArray })
			}
			// else check if we've seen this stop before
			else {
				let sameIdx = uniqueStops.findIndex(stop => stop.stopId === s.id);
				// if the stop has already been stored
				if (sameIdx > -1) {
					// then add the current route name
					uniqueStops[sameIdx].routes.push(set.name)
				}
				// else add the new stop
				else {
					let routeArray = [set.name]
					uniqueStops.push({ stopId: s.id, stopName: s.attributes.name, routes: routeArray })
				}
			}
		}
	}
	// filter out all unique stops for those that live on >1 routes
	let repeats = uniqueStops.filter(set => set.routes.length > 1)
	console.log("A list of stops that connect 2+ subway routes:")
	console.log(repeats)
}

// question 3

// Extend your program again such that the user can provide any two stops on the subway routes
// you listed for question 1.
// List a rail route you could travel to get from one stop to the other.
const calculateTripBetween = async (stop1, stop2) => {
	let response = await fetch(`https://api-v3.mbta.com/routes?filter[type]=0,1`).then(response => response.json())
	let routes = response.data.map(line => { return { id: line.id, name: line.attributes.long_name } })
	let organizedStops = await Promise.all(
		routes.map(route =>
			fetch(`https://api-v3.mbta.com/stops?filter[route]=${route.id}`)
				.then(response => response.json())
				.then(response => { return { id: route.id, name: route.name, stops: response.data } })
				.catch(err => console.error(err))
		)
	)

	let sortedOrganizedStops = organizedStops.sort((a, b) => a.stops.length - b.stops.length)
	let uniqueStops = []
	for (set of sortedOrganizedStops) {
		for (s of set.stops) {
			// if this is the very first entry for uniqueStops
			if (uniqueStops.length === 0) {
				let routeArray = [set.name]
				uniqueStops.push({ stopId: s.id, stopName: s.attributes.name, routes: routeArray })
			}
			// else check if we've seen this stop before
			else {
				let sameIdx = uniqueStops.findIndex(stop => stop.stopId === s.id);
				// if the stop has already been stored
				if (sameIdx > -1) {
					// then add the current route name
					uniqueStops[sameIdx].routes.push(set.name)
				}
				// else add the new stop
				else {
					let routeArray = [set.name]
					uniqueStops.push({ stopId: s.id, stopName: s.attributes.name, routes: routeArray })
				}
			}
		}
	}
	let repeats = uniqueStops.filter(set => set.routes.length > 1)
	// if both stops are on the same line, return that line
	// if both stops are not on the same line
	// identify if both lines have a common intermediary stop (if so, print both lines)
	// if not, find line(s) that will connect a -> (??) -> b, then print all
	// aka accumulate an array of every subway route we pass through starting from this current stop without repeats
	console.log('Looking for path from ' + stop1 + ' -> ' + stop2)
	let stop1data, stop2data;
	// search for stop by stop name (from args input) and store those values
	// NOTE: will error out later if the input was malformed/cannot match stop name to input
	for (s of uniqueStops) {
		if (s.stopName === stop1) {
			stop1data = s;
		}
		if (s.stopName === stop2) {
			stop2data = s;
		}
	}

	// parent function housing accumulator helper
	const findAllStops = (s1, s2) => {
		// if the 2 stops are already on the same line, return that value
		// if they both share multiple lines, pick the first
		let result = doAnyMatch(s1.routes, s2.routes)
		if (result.length > 0) {
			let answer = [result[0]]
			console.log(answer)
			return answer
		}
		else {
			// else begin searching from 1 of the starting lines
			let acc = [s1.routes.pop()];
			return findAllStopsHelper(s1, s2, acc, [s1])
		}
	}

	const findAllStopsHelper = (s1, s2, usedLines, seenStops) => {
		let goal = s2.routes
		// search through "repeats" array of stops with multiple routes for all unseen that connect to our usedLines
		let potentials = repeats.filter(set => (!seenStops.includes(set) && (doAnyMatch(set.routes, usedLines).length > 0)))
		// search through these potentials for a stop that connects to our goal
		let next = potentials.find(set => (!seenStops.includes(set) && (doAnyMatch(set.routes, goal).length > 0)))
		// if this stop exists, add its route and return the result
		if (next) {
			let result = doAnyMatch(next.routes, goal)
			usedLines.push(result[0])
			console.log(usedLines)
			return usedLines
		}
		let middle = potentials[0]
		// result = array of all matching routes between middle stop and goal stop
		let result = doAnyMatch(middle.routes, goal)
		// return if this new middle connects us to the final stop
		if (result.length > 0) {
			usedLines.push(result[0])
			console.log(usedLines)
			return usedLines
		}
		// add a new line to the acc and try again
		else {
			// filter out yet unused routes/lines from chosen middle station
			let temp = middle.routes.filter(r => (!usedLines.includes(r) && !s1.routes.includes(r)))
			// add the first of these as the line we are riding next
			usedLines.push(temp[0])
			// add this middle station to seen stops
			seenStops.push(middle)
			// try again starting from our new stop
			return findAllStopsHelper(middle, s2, usedLines, seenStops)
		}
	}

	findAllStops(stop1data, stop2data)
}

// if any in arr 2 matches in arr 1, return all matches
const doAnyMatch = (arr1, arr2) => {
	let result = [];

	for (x of arr1) {
		if (arr2.includes(x)) {
			result.push(x)
		}
	}
	return result;
}

// modified from node.js article -- How to parse command line arguments
var myArgs = process.argv.slice(2);

switch (myArgs[0]) {
	case 'one':
		console.log('Answering Question 1.')
		fetchRoutes()
		break;
	case 'two':
		console.log('Answering Question 2.')
		fetchRoutesConnections()
		break;
	case 'three':
		console.log('Answering Question 3.')
		calculateTripBetween(myArgs[1], myArgs[2])
		break;
	default:
		console.log('Not a valid set of arguments.');
}