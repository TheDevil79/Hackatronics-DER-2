import { useEffect, useState } from "react";


function AssetProperties({ asset, updateAsset }) {

  const [values, setValues] = useState({});


  // ---------------------------------------------------------
  // LOAD SELECTED ASSET VALUES
  // ---------------------------------------------------------

  useEffect(() => {

    if (!asset) {
      setValues({});
      return;
    }

    setValues({
      fuelType: asset.fuelType || "LPG",
      capacity: asset.capacity ?? 500,
      volume: asset.volume ?? 500,
      fillLevel: asset.fillLevel ?? 85,
      pressure: asset.pressure ?? 17,
      temperature: asset.temperature ?? 30,
      diameter: asset.diameter ?? 12,
      height: asset.height ?? 10,
      material: asset.material || "Carbon Steel",
      flowRate: asset.flowRate ?? 100,
      power: asset.power ?? 50,
      area: asset.area ?? 500,
      occupancy: asset.occupancy ?? 20,
      fluid: asset.fluid || "Water",
    });

  }, [asset]);


  // ---------------------------------------------------------
  // NO ASSET SELECTED
  // ---------------------------------------------------------

  if (!asset) {

    return (
      <aside className="asset-properties">

        <h2>ASSET DETAILS</h2>

        <div className="no-selection">

          <div>＋</div>

          <h3>
            No asset selected
          </h3>

          <p>
            Select an asset on the facility map to view and
            edit its properties.
          </p>

        </div>

      </aside>
    );

  }


  // ---------------------------------------------------------
  // HANDLE INPUT
  // ---------------------------------------------------------

  const handleChange = (field, value) => {

    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));

  };


  // ---------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------

  const handleSave = () => {

    if (!updateAsset) {
      console.warn("updateAsset callback is missing.");
      return;
    }

    updateAsset(asset.id, {
      ...values,

      capacity: Number(values.capacity),
      volume: Number(values.volume),
      fillLevel: Number(values.fillLevel),
      pressure: Number(values.pressure),
      temperature: Number(values.temperature),
      diameter: Number(values.diameter),
      height: Number(values.height),
      flowRate: Number(values.flowRate),
      power: Number(values.power),
      area: Number(values.area),
      occupancy: Number(values.occupancy),
    });

  };


  // ---------------------------------------------------------
  // ASSET TYPE
  // ---------------------------------------------------------

  const type = asset.type;


  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (

    <aside className="asset-properties">

      <h2>
        ASSET DETAILS
      </h2>


      <div className="selected-asset">

        <h3>
          {asset.icon} {asset.name}
        </h3>


        {/* ASSET ID */}

        <label>
          Asset ID

          <input
            value={asset.id}
            readOnly
          />

        </label>


        {/* =================================================
            STORAGE TANK
           ================================================= */}

        {type === "tank" && (
          <>

            <label>
              Fuel / Tank Type

              <select
                value={values.fuelType}
                onChange={(e) =>
                  handleChange(
                    "fuelType",
                    e.target.value
                  )
                }
              >

                <option>LPG</option>
                <option>Petrol</option>
                <option>Diesel</option>
                <option>Hydrogen</option>
                <option>Methane</option>
                <option>Ammonia</option>
                <option>Crude Oil</option>
                <option>Water</option>

              </select>

            </label>


            <label>
              Capacity (m³)

              <input
                type="number"
                min="0"
                value={values.capacity}
                onChange={(e) =>
                  handleChange(
                    "capacity",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Current Volume (m³)

              <input
                type="number"
                min="0"
                value={values.volume}
                onChange={(e) =>
                  handleChange(
                    "volume",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Fill Level (%)

              <input
                type="number"
                min="0"
                max="100"
                value={values.fillLevel}
                onChange={(e) =>
                  handleChange(
                    "fillLevel",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Diameter (m)

              <input
                type="number"
                min="0"
                value={values.diameter}
                onChange={(e) =>
                  handleChange(
                    "diameter",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Height (m)

              <input
                type="number"
                min="0"
                value={values.height}
                onChange={(e) =>
                  handleChange(
                    "height",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Operating Pressure (bar)

              <input
                type="number"
                min="0"
                value={values.pressure}
                onChange={(e) =>
                  handleChange(
                    "pressure",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Temperature (°C)

              <input
                type="number"
                value={values.temperature}
                onChange={(e) =>
                  handleChange(
                    "temperature",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Material

              <select
                value={values.material}
                onChange={(e) =>
                  handleChange(
                    "material",
                    e.target.value
                  )
                }
              >

                <option>Carbon Steel</option>
                <option>Stainless Steel</option>
                <option>Aluminium</option>
                <option>Other</option>

              </select>

            </label>

          </>
        )}


        {/* =================================================
            PRESSURE VESSEL
           ================================================= */}

        {type === "pressure-vessel" && (
          <>

            <label>
              Capacity (m³)

              <input
                type="number"
                value={values.capacity}
                onChange={(e) =>
                  handleChange(
                    "capacity",
                    e.target.value
                  )
                }
              />

            </label>

            <label>
              Operating Pressure (bar)

              <input
                type="number"
                value={values.pressure}
                onChange={(e) =>
                  handleChange(
                    "pressure",
                    e.target.value
                  )
                }
              />

            </label>

            <label>
              Temperature (°C)

              <input
                type="number"
                value={values.temperature}
                onChange={(e) =>
                  handleChange(
                    "temperature",
                    e.target.value
                  )
                }
              />

            </label>

            <label>
              Material

              <select
                value={values.material}
                onChange={(e) =>
                  handleChange(
                    "material",
                    e.target.value
                  )
                }
              >
                <option>Carbon Steel</option>
                <option>Stainless Steel</option>
              </select>

            </label>

          </>
        )}


        {/* =================================================
            PIPELINE
           ================================================= */}

        {type === "pipeline" && (
          <>

            <label>
              Fluid

              <select
                value={values.fluid}
                onChange={(e) =>
                  handleChange(
                    "fluid",
                    e.target.value
                  )
                }
              >
                <option>Water</option>
                <option>Oil</option>
                <option>Gas</option>
                <option>Steam</option>
                <option>Chemical</option>
              </select>

            </label>


            <label>
              Diameter (mm)

              <input
                type="number"
                value={values.diameter}
                onChange={(e) =>
                  handleChange(
                    "diameter",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Flow Rate

              <input
                type="number"
                value={values.flowRate}
                onChange={(e) =>
                  handleChange(
                    "flowRate",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Operating Pressure (bar)

              <input
                type="number"
                value={values.pressure}
                onChange={(e) =>
                  handleChange(
                    "pressure",
                    e.target.value
                  )
                }
              />

            </label>

          </>
        )}


        {/* =================================================
            PUMP / COMPRESSOR / MACHINERY
           ================================================= */}

        {[
          "pump",
          "compressor",
          "machinery",
        ].includes(type) && (
          <>

            <label>
              Power (kW)

              <input
                type="number"
                value={values.power}
                onChange={(e) =>
                  handleChange(
                    "power",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Flow Rate

              <input
                type="number"
                value={values.flowRate}
                onChange={(e) =>
                  handleChange(
                    "flowRate",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Operating Pressure (bar)

              <input
                type="number"
                value={values.pressure}
                onChange={(e) =>
                  handleChange(
                    "pressure",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Temperature (°C)

              <input
                type="number"
                value={values.temperature}
                onChange={(e) =>
                  handleChange(
                    "temperature",
                    e.target.value
                  )
                }
              />

            </label>

          </>
        )}


        {/* =================================================
            BUILDINGS
           ================================================= */}

        {[
          "building",
          "control-room",
          "warehouse",
          "laboratory",
          "maintenance",
          "admin",
        ].includes(type) && (
          <>

            <label>
              Area (m²)

              <input
                type="number"
                value={values.area}
                onChange={(e) =>
                  handleChange(
                    "area",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Building Height (m)

              <input
                type="number"
                value={values.height}
                onChange={(e) =>
                  handleChange(
                    "height",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Occupancy

              <input
                type="number"
                value={values.occupancy}
                onChange={(e) =>
                  handleChange(
                    "occupancy",
                    e.target.value
                  )
                }
              />

            </label>

          </>
        )}


        {/* =================================================
            STORAGE AREAS
           ================================================= */}

        {[
          "storage",
          "chemical-storage",
          "fuel-storage",
          "gas-storage",
        ].includes(type) && (
          <>

            <label>
              Storage Capacity (m³)

              <input
                type="number"
                value={values.capacity}
                onChange={(e) =>
                  handleChange(
                    "capacity",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Area (m²)

              <input
                type="number"
                value={values.area}
                onChange={(e) =>
                  handleChange(
                    "area",
                    e.target.value
                  )
                }
              />

            </label>


            <label>
              Material

              <select
                value={values.material}
                onChange={(e) =>
                  handleChange(
                    "material",
                    e.target.value
                  )
                }
              >

                <option>Carbon Steel</option>
                <option>Concrete</option>
                <option>Stainless Steel</option>
                <option>Other</option>

              </select>

            </label>

          </>
        )}


        {/* =================================================
            COMMON POSITION
           ================================================= */}

        <label>
          X Position

          <input
            value={Math.round(asset.x ?? 0)}
            readOnly
          />

        </label>


        <label>
          Y Position

          <input
            value={Math.round(asset.y ?? 0)}
            readOnly
          />

        </label>


        {/* SAVE */}

        <button
          type="button"
          className="save-asset"
          onClick={handleSave}
        >
          SAVE ASSET
        </button>

      </div>

    </aside>

  );
}


export default AssetProperties;