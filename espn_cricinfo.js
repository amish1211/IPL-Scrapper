const request = require('request');
const cheerio = require('cheerio');
const homepage="https://www.espncricinfo.com/series/ipl-2020-21-1210595";
const init_url = "https://www.espncricinfo.com";
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');




// console.log(process.cwd());
function create_dir(dirPath){
    if(!fs.existsSync(dirPath)){
        fs.mkdirSync(dirPath);
    }
}

function excelWriter(filePath, json, sheetName){
   
    const newWB = xlsx.utils.book_new();
    const newWS = xlsx.utils.json_to_sheet(json);
    xlsx.utils.book_append_sheet(newWB,newWS,sheetName);
    xlsx.writeFile(newWB,filePath);
}

function excelReader(filePath,sheetName){
    if(fs.existsSync(filePath)){
        const wb = xlsx.readFile(filePath);
        const excelData = wb.Sheets[sheetName];
        const ans = xlsx.utils.sheet_to_json(excelData);
        return ans;
    }
    else
        return null;
}


const current_dir = process.cwd();
const ipl_dir_path = path.join(current_dir,"IPL");



create_dir(ipl_dir_path);


request(homepage,cb);
function cb(err,response,html){
    if(err){
        request(homepage,cb);
    }
    else{
        extract_see_all_results(html)
    }
}

function extract_see_all_results(html){
    // console.log(html);  
    const $ = cheerio.load(html);
    const urlArr = $(".ds-block .ds-leading-none a");
    // console.log(urlArr.length);
    const all_result_url = init_url+$(urlArr[0]).attr("href");
    go_to_all_result(all_result_url);
}

function go_to_all_result(all_result_url){
    request(all_result_url,cb);
    function cb(err,response,html){
        if(err){
            request(all_result_url,cb);
        }
        else{
            get_all_player_card(html);
        }
    }
}

function get_all_player_card(html){
    const $ = cheerio.load(html);
        // console.log(html)
     const player_card_arr = $(".ds-w-1\\/2");
 
    for(let i = 0; i < player_card_arr.length;i++){
        const url_Arr = $(player_card_arr[i]).find("a.ds-underline-offset-4");
        const scorecard_url = init_url+$(url_Arr[3]).attr("href");
        const after_result = $(player_card_arr[i]).find(".ds-truncate.ds-text-tight-xs");
        const after_result_split = $(after_result).text().split(",");
        const match_loc = after_result_split[1];
        const matchDate = after_result_split[2]+','+after_result_split[3];
        // console.log(matchDate);
        const winnerElem=$(player_card_arr[i]).find(":not(.ds-opacity-50).ci-team-score");
        let winner="";
        if(winnerElem.length>1){
            winner="Tie";
        }else{
            winner=$($(winnerElem).find("p")).text().trim();
        }
        
        go_to_scorecard(scorecard_url,winner,matchDate,match_loc);
    }

   
}

function go_to_scorecard(scorecard_url,winner,matchDate,match_loc){
    request(scorecard_url,cb);
    function cb(err,response,html){
        if(err){
            request(scorecard_url,cb);
        }
        else{
            process_scoreboard(html,scorecard_url,winner,matchDate,match_loc);
        }
    }
}

function process_scoreboard(html,scorecard_url,winner,matchDate,match_loc){
    const $ = cheerio.load(html);
    const inningsArr = $(".ds-rounded-lg");
    const teamNames = [];

    for(let i =0; i < inningsArr.length;i++){
        const teamNameElem = $(inningsArr[i]).find(".ds-uppercase");  
        const teamName = teamNameElem.text().split("INNINGS")[0].trim();
        teamNames.push(teamName);
    
    }

    for(let i =0; i < inningsArr.length;i++){
        const currTeamDirPath = path.join(ipl_dir_path,teamNames[i]);
        create_dir(currTeamDirPath);
        const batsmenArr = $(inningsArr[i]).find("table:nth-child(1) tbody>tr.ds-text-tight-s");
        // console.log(batsmenArr.length);
        let obj_arr=[{
            "venue":match_loc.trim(),
            "date":matchDate.trim(),
            "opponent":teamNames[(i+1)%2],
            "result":winner,
            "run":"",
            "balls":"",
            "four":"",
            "six":"",
            "sr":""
            }];

            // console.log(obj_arr);
        for(let j =0; j < batsmenArr.length-1;j++){
            const batsmenCol=$(batsmenArr[j]).find("td");
            // console.log(batsmenCol.length);
            
                let batsman_name="";
                const temp_batsman_name=$(batsmenCol[0]).text().trim();
                let index =temp_batsman_name.indexOf("†");
                batsman_name=temp_batsman_name;
                if(index!==-1)
                    batsman_name = temp_batsman_name.substring(0,index).trim();
                
                index = batsman_name.indexOf("(c)");
                if(index!==-1)
                    batsman_name = batsman_name.substring(0,index).trim();

                batsman_file_path = path.join(currTeamDirPath,batsman_name+".xlsx");
                
                    
                obj_arr[0].run = $(batsmenCol[2]).text().trim();
                obj_arr[0].balls = $(batsmenCol[3]).text().trim();
                obj_arr[0].four = $(batsmenCol[5]).text().trim();
                obj_arr[0].six  = $(batsmenCol[6]).text().trim();
                obj_arr[0].sr = $(batsmenCol[7]).text().trim();
               
                // console.log(obj_arr);
                // console.log(obj_arr.venue,obj_arr.date,obj_arr.opponent,obj_arr.result,obj_arr.run,obj_arr.balls,obj_arr.six,obj_arr.four,obj_arr.sr);
                console.log(obj_arr);
                if(!fs.existsSync(batsman_file_path)){

                    excelWriter(batsman_file_path,obj_arr,"sheet1");
                }else{
                    const prev_obj = excelReader(batsman_file_path,"sheet1");
                    
                    // console.log("prev:",prev_obj);
                    prev_obj.push(obj_arr[0]);
                    let curr_obj = prev_obj;
                    // console.log(curr_obj)
                    excelWriter(batsman_file_path,curr_obj,"sheet1");
            


            }
        }   
    }
    
}