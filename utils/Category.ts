export const enum Category {
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
}

export interface CategoryDetail {
	category: number;
	name: string;
	floor: string;
	price: string;
	supply: number;
	startingTokenId: number;
}

export const categories: CategoryDetail[] = [
	{
		category: Category.A,
		name: "A",
		floor: "EG",
		price: "100",
		supply: 1,
		startingTokenId: 0,
	},
	{
		category: Category.B,
		name: "B",
		floor: "EG",
		price: "50",
		supply: 2,
		startingTokenId: 1,
	},
	{
		category: Category.C,
		name: "C",
		floor: "EG",
		price: "30",
		supply: 8,
		startingTokenId: 3,
	},
	{
		category: Category.D,
		name: "D",
		floor: "EG",
		price: "20",
		supply: 12,
		startingTokenId: 11,
	},
	{
		category: Category.E,
		name: "E",
		floor: "1OG",
		price: "3",
		supply: 16,
		startingTokenId: 23,
	},
	{
		category: Category.F,
		name: "F",
		floor: "1OG",
		price: "2",
		supply: 18,
		startingTokenId: 39,
	},
	{
		category: Category.G,
		name: "G",
		floor: "1OG",
		price: "1",
		supply: 24,
		startingTokenId: 57,
	},
	{
		category: Category.H,
		name: "H",
		floor: "1OG",
		price: "0.7",
		supply: 32,
		startingTokenId: 81,
	},
	{
		category: Category.I,
		name: "I",
		floor: "2OG",
		price: "0.5",
		supply: 32,
		startingTokenId: 113,
	},
	{
		category: Category.J,
		name: "J",
		floor: "2OG",
		price: "0.3",
		supply: 36,
		startingTokenId: 145,
	},
	{
		category: Category.K,
		name: "K",
		floor: "2OG",
		price: "0.15",
		supply: 41,
		startingTokenId: 181,
	},
];
