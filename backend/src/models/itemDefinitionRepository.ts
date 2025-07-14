import db from "../config/database";
import { MachinesInformation } from "../types/thoh";
import AppError from "../utils/errorHandlingMiddleware/appError";

export const getMachines = async () => {
    const query = `SELECT * from item_definitions WHERE item_name LIKE '%machine%'`;
    try {
        const result = await db.query(query);
        return result.rows;
    } catch (error) {
        throw new AppError("Failed to get the item definitions. Please try again later", 500);
    }
};

export const updateMachineWeights = async (machineInfo: MachinesInformation[]) => {
    if (!machineInfo || machineInfo.length === 0) {
        console.log("No machine information provided.");
        return;
    }

    // This will hold all the valuesflattened: ['machineA', 120, 'machineB', 150]
    const params: (string | number)[] = [];
    // This will hold the placeholder groups: ['($1, $2)', '($3, $4)']
    const valuePlaceholders: string[] = [];

    machineInfo.forEach((machine, index) => {
        console.log(machine.weight);
        const i = index * 2;
        valuePlaceholders.push(`($${i + 1}, $${i + 2}::numeric)`);
        params.push(machine.machineName, machine.weight);
    });

    const query = `
        UPDATE item_definitions AS t
        SET weight_per_unit = v.weight
        FROM (VALUES ${valuePlaceholders.join(", ")}) AS v(machineName, weight)
        WHERE t.item_name = v.machineName;
    `;

    try {
        const result = await db.query(query, params);
        console.log(`${result.rowCount} machine weights updated successfully.`);
    } catch (error) {
        console.error("Failed to update machine weights:", error);
        throw new Error("Database update failed.");
    }
};
