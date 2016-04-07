/// <reference path="../../typings/react/react.d.ts" />
/// <reference path="../../typings/react/react-dom.d.ts" />
/// <reference path="../../typings/jquery/jquery.d.ts" />
import React = require('react');
import ReactDOM = require('react-dom');
import $ = require('jquery');

interface ISportType{
    id: string;
    name: string;
    marketCount: number;
}

class SportType implements ISportType{
    private _id :string;
    private _name :string;
    private _marketCount :number;
    
    constructor(id :string, name :string, marketCount :number){
        this._id = id;
        this._name = name;
        this._marketCount = marketCount;
    }
    get id(){
        return this._id;
    }
    
    get name(){
        return this._name;
    }
    
    get marketCount(){
        return this._marketCount;
    }
}

interface ISportTypeProperties{
    sportType : ISportType;
    isSelected: boolean;
    onClicked: (ISportType)=> void; 
}

interface IAllSportsProperties{
    sports: Array<ISportType>;
}

interface IAllSportsState{
    isLoading: boolean;
    sportSelected: ISportType;
}


class SportTypeComponent extends React.Component<ISportTypeProperties,{}>{
    constructor(props : ISportTypeProperties){
        super(props);
    }
    
    private onClicked(event: any){
        this.props.onClicked(this.props.sportType);
    } 
    
    public render(){
        var className = "sportType " + this.props.isSelected?"selectedSport": "";
        return (<div className={className}>
                    <p>{this.props.sportType.name}</p>
                    <p>{this.props.sportType.marketCount}</p>
                </div>);
    }
}

class AllSportsComponent extends React.Component<IAllSportsProperties, IAllSportsState>{
    constructor(props : IAllSportsProperties){
        super(props);
        this.state = {isLoading: true, sportSelected: null};
    }
    
    private onSportClicked(sportClicked: ISportType){
        this.setState({sportSelected: sportClicked, isLoading: this.state.isLoading});
    }
    
    public componentDidMount(){
        $.ajax({ 
            url: '/api/v2/getAllSports',
            dataType: 'application/json',
            type: 'GET',
            success: function (data) {
                this.props.sports = data.eventTypes.map((sport)=>{
                    return new SportType(sport.id, sport.name, sport.marketCount);
                });
                this.setState({isLoading: false});    
            }.bind(this),
            error: function (data) {
                console.log(''+ data);
            }
        });
    }
    
    public render(){
        if(this.state.isLoading){
            return (<span>Loading Sports....</span>);
        }
        var allSports = this.props.sports.forEach((sport, index)=>{
            return (<SportTypeComponent key={sport.name} isSelected={(this.state.sportSelected.name === sport.name)} sportType={sport} onClicked={this.onSportClicked} />);
        });
        return (<div className="allSports">
                    {allSports}
                </div>);
    }
}
var allSports = new Array<ISportType>();
ReactDOM.render(<AllSportsComponent  sports={allSports} />, document.getElementById('content') );
