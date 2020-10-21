const {Sequelize, DataTypes, Model} = require('sequelize')
const path = require('path')
const db = process.env.NODE_ENV === 'test'
    ? new Sequelize('sqlite::memory:', null, null, {dialect: 'sqlite'})
    : new Sequelize({dialect: 'sqlite', storage: path.join(__dirname, 'data.db')})

class Restaurant extends Model{}
class Menu extends Model{}
class Item extends Model{}

Restaurant.init({
    name: DataTypes.STRING,
    image: DataTypes.STRING
}, {sequelize:db})

Menu.init({
    title: DataTypes.STRING,
}, {sequelize:db})

Item.init({
    name: DataTypes.STRING,
    price: DataTypes.FLOAT,
}, {sequelize:db})

Restaurant.hasMany(Menu, {as: 'menus'})
Menu.belongsTo(Restaurant)
Menu.hasMany(Item, {as: 'items'})
Item.belongsTo(Menu)

module.exports = {Restaurant, Menu, Item, db}