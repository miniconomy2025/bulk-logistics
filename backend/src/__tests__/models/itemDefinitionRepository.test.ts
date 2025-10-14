// src/services/__tests__/machineService.test.ts

import { getMachines, updateMachineWeights } from '../../models/itemDefinitionRepository';
import db from '../../config/database';
import AppError from '../../utils/errorHandlingMiddleware/appError';
import { MachinesInformation } from '../../types/thoh';

jest.mock('../../config/database');
const mockedQuery = db.query as jest.Mock;

describe('Machine Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMachines', () => {
    it('should return list of machines when query succeeds', async () => {
      const mockMachines = [
        { item_id: 1, item_name: 'machineA', weight_per_unit: 120 },
        { item_id: 2, item_name: 'machineB', weight_per_unit: 150 },
      ];

      mockedQuery.mockResolvedValueOnce({ rows: mockMachines });

      const result = await getMachines();

      expect(mockedQuery).toHaveBeenCalledWith(
        "SELECT * from item_definitions WHERE item_name LIKE '%machine%'"
      );

      expect(result).toEqual(mockMachines);
    });

    it('should throw AppError when query fails', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('DB Error'));

      await expect(getMachines()).rejects.toThrow(AppError);
      await expect(getMachines()).rejects.toThrow('Failed to get the item definitions. Please try again later');
    });
  });

  describe('updateMachineWeights', () => {
    it('should return early if empty machineInfo is passed', async () => {
      const result = await updateMachineWeights([]);

      expect(mockedQuery).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should execute update query with correct parameters', async () => {
      const machines: MachinesInformation[] = [
        {
          machineName: 'machineA',
          inputs: 'input1',
          quantity: 1,
          inputRatio: {}, // replace with valid MachineInputRatio if required
          productionRate: 50,
          price: 100,
          weight: 120,
        },
        {
          machineName: 'machineB',
          inputs: 'input2',
          quantity: 2,
          inputRatio: {},
          productionRate: 60,
          price: 150,
          weight: 180,
        },
      ];

      mockedQuery.mockResolvedValueOnce({ rowCount: 2 });

      await updateMachineWeights(machines);

      // Construct expected query string
      const expectedQuery = `
        UPDATE item_definitions AS t
        SET weight_per_unit = v.weight
        FROM (VALUES ($1, $2::numeric), ($3, $4::numeric)) AS v(machineName, weight)
        WHERE t.item_name = v.machineName;
    `;

      const expectedParams = ['machineA', 120, 'machineB', 180];

      expect(mockedQuery).toHaveBeenCalledWith(expectedQuery, expectedParams);
    });

    it('should throw error when update fails', async () => {
      const machines: MachinesInformation[] = [
        {
          machineName: 'machineX',
          inputs: 'inputX',
          quantity: 1,
          inputRatio: {},
          productionRate: 40,
          price: 90,
          weight: 111,
        },
      ];
      mockedQuery.mockRejectedValueOnce(new Error('Update failed'));

      await expect(updateMachineWeights(machines)).rejects.toThrow('Database update failed');
    });
  });
});
