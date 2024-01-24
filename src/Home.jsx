import { useState, useEffect } from "react";
import "./App.css"

function Home() {
    const [text, setText] = useState("");
    useEffect(() => {
        setRelations(parseRelations(text));
    }, [text]);


    const [relations, setRelations] = useState({});
    const [query, setQuery] = useState("");

    function handleChange(e) {
        setText(e.target.value);
    }

    function parseRelations(input) {
        if (input === "") return {};
        const lines = input.trim().split("\n");
        const parsedRelations = {};

        let i;

        for (i = 0; i < lines.length; ) {
            const header = lines[i].split(/\s+/).map((item) => {
                return item.replace(/[(),]+/g, "");
            });
            parsedRelations[header[0]] = {};
            for (let j = 1; j < header.length; ++j) {
                if (header[j] === "=") break;
                parsedRelations[header[0]][header[j]] = [];
            }

            for (i = i+1; i < lines.length; ++i) {
                if (lines[i] === "}") {
                    ++i;
                    while (lines[i] === "") ++i;
                    break;
                }

                lines[i] = lines[i].trim().replace(/["]+/g, "").split(",").map((item) => item.trim());
                for (let j = 1; j < header.length; ++j) {
                    if (header[j] === "=") break;
                    parsedRelations[header[0]][header[j]].push(lines[i][j-1]);
                }
            }
        }
        return parsedRelations;
    }

    function handleQuery(e) {
        setQuery(e.target.value);
    }

    function parseQuery(input) {
        const line = input.replace(/[()]+/g, " ").trim().split(/\s+/);
        let queryObject = {};
        queryObject["operation"] = [];
        queryObject["fields"] = [];
        queryObject["from"] = [];
        queryObject["where"] = [];

        for (let i = line.length-1; i >= 0; --i) {
            if (relations.hasOwnProperty(line[i])) {
                queryObject.from.push(line[i]);
            } else {
                let match = false;
                let fields = line[i].replace(/[,]+/g, " ").trim().split(/\s+/);
                for (let each in relations) {
                    for (let field of fields) {
                        if (relations[each].hasOwnProperty(field)) {
                            match = true;
                            queryObject.fields.push(field);
                            break;
                        }
                    }
                }

                if (!match) {
                    switch (line[i]) {
                        case "select":
                        case "project":
                        case "join":
                        case "ojoin":
                        case "ljoin":
                        case "rjoin":
                        case "union":
                        case "intersect":
                        case "minus":
                            queryObject.operation.push(line[i]);
                            match = true;
                            break;
                        default:
                            break;
                    }

                    if (!match) {
                        line[i] = line[i].replace(/["]+/g, "");
                        line[i] = line[i].replace(/(!=|<|>|<=|>=|=)/g, " $1 ").trim().split(/\s+/);
                        queryObject.where.push({
                            "field": line[i][0],
                            "operator": line[i][1],
                            "value": line[i][2]
                        });
                    }
                }
            }
        }
        // console.log(relations);
        // console.log(queryObject);
        return queryObject;
    }

    function processQuery(queryObj) {
        let temp = {};
        const result = {};

        for (let i = queryObj.operation.length-1; i >= 0; --i) {
            if (queryObj.operation[i] === "select" || queryObj.operation[i] === "project") {
                if (Object.keys(temp).length === 0) {
                    temp = relations[queryObj.from[queryObj.from.length-1]];
                    queryObj.from = queryObj.from.slice(0, queryObj.from.length-1);
                }
                
                if (queryObj.operation[i] === "select") {
                    let deleted = [];
                    let where = queryObj.where[queryObj.where.length-1];
                    queryObj.where = queryObj.where.slice(0, queryObj.where.length-1);
                    for (let field in temp) {
                        if (field === where.field) {
                            for (let i = 0; i < temp[field].length; ++i) {
                                switch (where.operator) {
                                    case "!=":
                                        if (temp[field][i] == where.value) {
                                            deleted.push(i); 
                                            break;
                                        }
                                    case "=":
                                        if (temp[field][i] != where.value) {
                                            deleted.push(i); 
                                            break;
                                        }
                                    case "<":
                                        if (temp[field][i] >= where.value) {
                                            deleted.push(i); 
                                            break;
                                        }
                                    case ">":
                                        if (temp[field][i] <= where.value) {
                                            deleted.push(i); 
                                            break;
                                        }
                                    default:
                                        break;
                                }
                            }
                            break;
                        }
                    }
                    for (let each of deleted) {
                        for (let field in temp) {
                            temp[field] = temp[field].slice(0, each).concat(temp[field].slice(each+1));
                        }
                    }
                    console.log(temp);
                } else {

                }
            }
        }
    }

    return (
        <>
            <textarea
                value = {text}
                onChange = {handleChange}
                style = {{width: '100%', height: '400px'}}
            />
            <br /> <br />   

            <input 
                id = "query"
                type = "text"
                value = {query}
                style = {{width: '100%'}}
                onChange = {handleQuery}
            />
            <br /> <br />   

            <button onClick = {() => processQuery(parseQuery(query))}> Submit </button>

            <div>
                <table style={{ borderCollapse: 'collapse', width: '100%'}}>
                    <thead>

                    </thead>
                    <tbody>

                    </tbody>
                </table>
            </div>
        </>
    )
}

export default Home;